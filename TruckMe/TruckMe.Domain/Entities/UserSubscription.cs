using TruckMe.Domain.Common;

namespace TruckMe.Domain.Entities;

public class UserSubscription : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid SubscriptionPlanId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal MonthlyFeePaid { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public SubscriptionPlan SubscriptionPlan { get; set; } = null!;
}
