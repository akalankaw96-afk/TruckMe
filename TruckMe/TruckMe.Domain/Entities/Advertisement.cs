using TruckMe.Domain.Common;

namespace TruckMe.Domain.Entities;

public class Advertisement : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string TargetAudience { get; set; } = "All"; // All, Customers, Drivers
}
