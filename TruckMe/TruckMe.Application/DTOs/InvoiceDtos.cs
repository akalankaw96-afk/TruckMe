using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record InvoiceResponse(
    Guid BookingId,
    string InvoiceNumber,
    DateTime IssuedAt,
    string CustomerName,
    string CustomerPhone,
    string PickupAddress,
    int TotalStopsCount,
    VehicleSize VehicleSize,
    CargoType CargoType,
    decimal BaseFareLkr,
    decimal DistanceFareLkr,
    decimal AddOnFareLkr,
    decimal SubtotalLkr,
    decimal PlatformCommissionLkr,
    decimal DriverPayoutLkr,
    decimal TaxLkr,
    decimal GrandTotalLkr,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus
);
