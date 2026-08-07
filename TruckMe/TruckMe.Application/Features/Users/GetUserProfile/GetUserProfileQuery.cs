using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Users.GetUserProfile;

public class GetUserProfileQuery : IRequest<UserResponse?>
{
    public Guid UserId { get; set; }
}

public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, UserResponse?>
{
    private readonly IApplicationDbContext _context;

    public GetUserProfileQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserResponse?> Handle(GetUserProfileQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null) return null;

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
