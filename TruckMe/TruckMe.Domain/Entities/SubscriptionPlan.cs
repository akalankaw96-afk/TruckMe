using TruckMe.Domain.Common;

namespace TruckMe.Domain.Entities;

public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyFeeLkr { get; set; }
    public decimal DiscountPercentage { get; set; }
    public bool HasPriorityBooking { get; set; }
    public bool HasDedicatedAccountManager { get; set; }
    public bool HasAdvancedReporting { get; set; }
    public bool IsActive { get; set; } = true;
}
