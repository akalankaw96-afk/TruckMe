using TruckMe.Domain.Common;

namespace TruckMe.Domain.Entities;

public class Review : BaseEntity
{
    public Guid BookingId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid DriverId { get; set; }

    /// <summary>Overall rating from 1 to 5.</summary>
    public int Rating { get; set; }

    public string? Comment { get; set; }

    // Sub-ratings (1–5 each)
    public int PunctualityRating { get; set; }
    public int ProfessionalismRating { get; set; }
    public int VehicleConditionRating { get; set; }
    public int ServiceRating { get; set; }

    // Navigation properties
    public Booking Booking { get; set; } = null!;
}
