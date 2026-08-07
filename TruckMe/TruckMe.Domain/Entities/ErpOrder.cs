using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class ErpOrder : BaseEntity
{
    public string ExternalSystemName { get; set; } = string.Empty; // SAP, Oracle, Dynamics, Local
    public string ExternalOrderId { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid? BookingId { get; set; }
    public string PickupAddress { get; set; } = string.Empty;
    public string DeliveryAddress { get; set; } = string.Empty;
    public CargoType CargoType { get; set; }
    public double WeightKg { get; set; }
    public VehicleSize VehicleSize { get; set; }
    public string Status { get; set; } = "Dispatched";
    public DateTime RequestedDeliveryDate { get; set; }

    // Navigation properties
    public User Customer { get; set; } = null!;
    public Booking? Booking { get; set; }
}
