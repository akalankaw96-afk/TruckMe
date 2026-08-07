using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class Driver : BaseEntity
{
    public Guid UserId { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public string? LicenseImageUrl { get; set; }
    public string VehiclePlateNumber { get; set; } = string.Empty;
    public VehicleSize VehicleType { get; set; }
    public bool IsOnline { get; set; }
    public DriverStatus Status { get; set; } = DriverStatus.Offline;
    public decimal RatingAverage { get; set; } = 0m;
    public int TotalRatings { get; set; }
    public int TotalCompletedJobs { get; set; }
    public decimal TotalEarnings { get; set; } = 0m;
    public decimal CurrentLatitude { get; set; }
    public decimal CurrentLongitude { get; set; }
    public DateTime? LastLocationUpdate { get; set; }
    public string? FcmToken { get; set; }
    public bool IsApproved { get; set; } = false;

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<Booking> AssignedBookings { get; set; } = new List<Booking>();
}
