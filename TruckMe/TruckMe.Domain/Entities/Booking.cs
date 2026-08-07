using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class Booking : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid? DriverId { get; set; }

    // Pickup details
    public string PickupAddress { get; set; } = string.Empty;
    public decimal PickupLatitude { get; set; }
    public decimal PickupLongitude { get; set; }
    public string PickupContactName { get; set; } = string.Empty;
    public string PickupContactPhone { get; set; } = string.Empty;

    // Cargo details
    public CargoType CargoType { get; set; }
    public string? CargoDescription { get; set; }
    public double? CargoWeightKg { get; set; }
    public double? CargoVolumeCbm { get; set; }
    public VehicleSize RequiredVehicleSize { get; set; }

    // Service add-ons
    public bool NeedsHelpers { get; set; }
    public int HelperCount { get; set; }
    public bool NeedsLoading { get; set; }
    public bool NeedsUnloading { get; set; }
    public bool IsExpress { get; set; }
    public bool IsFullDay { get; set; }
    public bool IsReturnLoad { get; set; }
    public bool IsDedicatedVehicle { get; set; }
    public string? ErpOrderReference { get; set; }

    // Fare breakdown
    public decimal BaseFare { get; set; }
    public decimal DistanceFare { get; set; }
    public decimal StopFare { get; set; }
    public decimal AddOnFare { get; set; }
    public decimal SurgeMultiplier { get; set; } = 1.0m;
    public decimal TotalFare { get; set; }

    // Commission & payout
    public decimal CommissionRate { get; set; } = 0.15m;
    public decimal Commission { get; set; }
    public decimal DriverPayout { get; set; }

    // Trip metadata
    public decimal TotalDistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Status
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public string? CancellationReason { get; set; }

    // Navigation properties
    public User Customer { get; set; } = null!;
    public Driver? Driver { get; set; }
    public ICollection<DeliveryStop> DeliveryStops { get; set; } = new List<DeliveryStop>();
    public Payment? Payment { get; set; }
    public Review? Review { get; set; }
}
