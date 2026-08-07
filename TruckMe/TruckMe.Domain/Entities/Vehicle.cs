using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class Vehicle : BaseEntity
{
    public Guid DriverId { get; set; }
    public string PlateNumber { get; set; } = string.Empty;
    public VehicleSize Size { get; set; }
    public string Model { get; set; } = string.Empty;
    public int CapacityKg { get; set; }
    public double? LengthMeters { get; set; }
    public double? WidthMeters { get; set; }
    public double? HeightMeters { get; set; }
    public VehicleStatus Status { get; set; } = VehicleStatus.Active;
    public string? ImageUrl { get; set; }

    // Navigation properties
    public Driver Driver { get; set; } = null!;
}
