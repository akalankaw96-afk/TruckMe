using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class ReturnLoad : BaseEntity
{
    public Guid DriverId { get; set; }
    public string OriginCity { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public decimal OriginLatitude { get; set; }
    public decimal OriginLongitude { get; set; }
    public decimal DestinationLatitude { get; set; }
    public decimal DestinationLongitude { get; set; }
    public DateTime AvailableFrom { get; set; }
    public DateTime AvailableUntil { get; set; }
    public VehicleSize VehicleSize { get; set; }
    public int CapacityKg { get; set; }
    public decimal DiscountPercentage { get; set; } = 20.0m;
    public bool IsBooked { get; set; } = false;
    public string? Remarks { get; set; }

    // Navigation properties
    public Driver Driver { get; set; } = null!;
}
