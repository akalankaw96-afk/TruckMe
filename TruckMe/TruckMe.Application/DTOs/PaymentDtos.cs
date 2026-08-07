// DTOs/PaymentDtos.cs
using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record PaymentResponse(
    Guid Id,
    Guid BookingId,
    decimal Amount,
    string Method,
    string Status,
    string? TransactionId,
    decimal CommissionAmount,
    decimal DriverPayoutAmount,
    DateTime? PaidAt,
    string? InvoiceUrl
);

public record ProcessPaymentRequest(
    Guid BookingId,
    PaymentMethod Method,
    string? TransactionId = null
);
