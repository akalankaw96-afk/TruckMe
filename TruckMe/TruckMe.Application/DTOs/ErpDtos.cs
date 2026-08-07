using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record ErpDispatchOrderRequest(
    string ExternalSystemName, // SAP, Oracle, Dynamics
    string ExternalOrderId,
    Guid CustomerId,
    string PickupAddress,
    decimal PickupLatitude,
    decimal PickupLongitude,
    string DeliveryAddress,
    decimal DeliveryLatitude,
    decimal DeliveryLongitude,
    CargoType CargoType,
    double WeightKg,
    VehicleSize VehicleSize,
    DateTime RequestedDeliveryDate
);

public record ErpDispatchOrderResponse(
    Guid ErpOrderId,
    Guid? BookingId,
    string ExternalOrderId,
    string Status,
    DateTime DispatchedAt
);

public record ErpOrderStatusDto(
    string ExternalOrderId,
    string ExternalSystemName,
    string PlatformStatus,
    Guid? BookingId,
    DateTime UpdatedAt
);
