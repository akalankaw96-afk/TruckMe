using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Users.UpdateUserProfile;

public class UpdateUserProfileCommand : IRequest<UserResponse?>
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public string? CompanyName { get; set; }
    public string? BusinessType { get; set; }
    public string? TaxId { get; set; }
}

public class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, UserResponse?>
{
    private readonly IApplicationDbContext _context;

    public UpdateUserProfileCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserResponse?> Handle(UpdateUserProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null) return null;

        user.FullName = request.FullName;
        user.PhoneNumber = request.PhoneNumber;
        if (request.ProfileImageUrl != null) user.ProfileImageUrl = request.ProfileImageUrl;
        if (request.CompanyName != null) user.CompanyName = request.CompanyName;
        if (request.BusinessType != null) user.BusinessType = request.BusinessType;
        if (request.TaxId != null) user.TaxId = request.TaxId;

        await _context.SaveChangesAsync(cancellationToken);

        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.Role.ToString(),
            user.WalletBalance,
            user.ProfileImageUrl,
            user.CompanyName,
            user.BusinessType,
            user.TaxId,
            user.IsPremiumMember
        );
    }
}
