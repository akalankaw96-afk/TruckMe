using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Subscriptions.GetUserSubscription;

public class GetUserSubscriptionQuery : IRequest<UserSubscriptionResponse?>
{
    public Guid UserId { get; set; }
}

public class GetUserSubscriptionQueryHandler : IRequestHandler<GetUserSubscriptionQuery, UserSubscriptionResponse?>
{
    private readonly IApplicationDbContext _context;

    public GetUserSubscriptionQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserSubscriptionResponse?> Handle(GetUserSubscriptionQuery request, CancellationToken cancellationToken)
    {
        var sub = await _context.UserSubscriptions
            .AsNoTracking()
            .Include(us => us.SubscriptionPlan)
            .FirstOrDefaultAsync(us => us.UserId == request.UserId && us.IsActive, cancellationToken);

        if (sub == null) return null;

        return new UserSubscriptionResponse(
            sub.Id,
            sub.UserId,
            sub.SubscriptionPlan.Name,
            sub.StartDate,
            sub.EndDate,
            sub.IsActive,
            sub.MonthlyFeePaid,
            sub.SubscriptionPlan.DiscountPercentage
        );
    }
}
