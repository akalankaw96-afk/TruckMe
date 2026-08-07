using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Features.Subscriptions.GetSubscriptionPlans;

public class GetSubscriptionPlansQuery : IRequest<List<SubscriptionPlanDto>>
{
}

public class GetSubscriptionPlansQueryHandler : IRequestHandler<GetSubscriptionPlansQuery, List<SubscriptionPlanDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSubscriptionPlansQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SubscriptionPlanDto>> Handle(GetSubscriptionPlansQuery request, CancellationToken cancellationToken)
    {
        var plans = await _context.SubscriptionPlans
            .AsNoTracking()
            .Where(sp => sp.IsActive)
            .ToListAsync(cancellationToken);

        // Seed default plans if none exist yet
        if (!plans.Any())
        {
            var defaultPlans = new List<SubscriptionPlan>
            {
                new SubscriptionPlan
                {
                    Id = Guid.NewGuid(),
                    Name = "Starter Business",
                    Description = "Ideal for small distributors & retail chains needing occasional dedicated transport.",
                    MonthlyFeeLkr = 15000m,
                    DiscountPercentage = 5.0m,
                    HasPriorityBooking = true,
                    HasDedicatedAccountManager = false,
                    HasAdvancedReporting = false
                },
                new SubscriptionPlan
                {
                    Id = Guid.NewGuid(),
                    Name = "Enterprise Logistics",
                    Description = "Designed for FMCG, manufacturing, and supermarket networks with high daily dispatch volume.",
                    MonthlyFeeLkr = 45000m,
                    DiscountPercentage = 12.0m,
                    HasPriorityBooking = true,
                    HasDedicatedAccountManager = true,
                    HasAdvancedReporting = true
                }
            };

            await _context.SubscriptionPlans.AddRangeAsync(defaultPlans, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            plans = defaultPlans;
        }

        return plans.Select(p => new SubscriptionPlanDto(
            p.Id,
            p.Name,
            p.Description,
            p.MonthlyFeeLkr,
            p.DiscountPercentage,
            p.HasPriorityBooking,
            p.HasDedicatedAccountManager,
            p.HasAdvancedReporting
        )).ToList();
    }
}
