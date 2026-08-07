// Features/Auth/Register/RegisterCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Auth.Register;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly IApplicationDbContext _context;
    private readonly ITokenService _tokenService;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IDriverRepository driverRepository,
        IApplicationDbContext context,
        ITokenService tokenService)
    {
        _userRepository = userRepository;
        _driverRepository = driverRepository;
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> Handle(
        RegisterCommand request,
        CancellationToken cancellationToken)
    {
        // Check for duplicate email
        var existingUser = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { nameof(request.Email), new[] { "A user with this email address already exists." } }
            });
        }

        // Parse the role enum
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var userRole))
            userRole = UserRole.Customer;

        // Hash with BCrypt
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email.ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber,
            PasswordHash = passwordHash,
            Role = userRole,
            WalletBalance = 0m,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        // If the registering user is a Driver, create a linked Driver profile
        if (userRole == UserRole.Driver)
        {
            var driver = new Driver
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                IsOnline = false,
                Status = DriverStatus.Offline,
                RatingAverage = 0m,
                TotalRatings = 0,
                TotalCompletedJobs = 0,
                TotalEarnings = 0m,
                CurrentLatitude = 0.0m,
                CurrentLongitude = 0.0m,
                IsApproved = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _driverRepository.AddAsync(driver);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var token = _tokenService.GenerateToken(user);
        var tokenResult = _tokenService.GenerateTokenResult(user);

        return new AuthResponse(
            Token: token,
            ExpiresAt: tokenResult.ExpiresAt,
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString()
        );
    }
}
