using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid BookingId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? TransactionId { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal DriverPayoutAmount { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? PayoutAt { get; set; }
    public string? InvoiceUrl { get; set; }

    // Navigation properties
    public Booking Booking { get; set; } = null!;
}
