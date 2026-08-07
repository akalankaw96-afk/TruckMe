using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Features.Subscriptions.SubscribeUser;

public class SubscribeUserCommand : IRequest<UserSubscriptionResponse?>
{
    public Guid UserId { get; set; }
    public Guid SubscriptionPlanId { get; set; }
}

public class SubscribeUserCommandHandler : IRequestHandler<SubscribeUserCommand, UserSubscriptionResponse?>
{
    private readonly IApplicationDbContext _context;

    public SubscribeUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserSubscriptionResponse?> Handle(SubscribeUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user == null) return null;

        var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == request.SubscriptionPlanId, cancellationToken);
        if (plan == null) return null;

        // Deactivate old active subscriptions
        var existingSubs = await _context.UserSubscriptions
            .Where(us => us.UserId == request.UserId && us.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var sub in existingSubs)
        {
            sub.IsActive = false;
        }

        var newSub = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            SubscriptionPlanId = plan.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(30),
            IsActive = true,
            MonthlyFeePaid = plan.MonthlyFeeLkr
        };

        user.IsPremiumMember = true;

        await _context.UserSubscriptions.AddAsync(newSub, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return new UserSubscriptionResponse(
            newSub.Id,
            user.Id,
            plan.Name,
            newSub.StartDate,
            newSub.EndDate,
            newSub.IsActive,
            newSub.MonthlyFeePaid,
            plan.DiscountPercentage
        );
    }
}
