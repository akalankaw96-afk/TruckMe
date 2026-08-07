using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class DeliveryStop : BaseEntity
{
    public Guid BookingId { get; set; }

    /// <summary>
    /// 1-based ordering of this stop within the booking's delivery route.
    /// </summary>
    public int Sequence { get; set; }

    public string Address { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DeliveryStopStatus Status { get; set; } = DeliveryStopStatus.Pending;
    public DateTime? ArrivedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    public Booking Booking { get; set; } = null!;
}
