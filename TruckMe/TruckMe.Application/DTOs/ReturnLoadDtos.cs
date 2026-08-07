using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record CreateReturnLoadRequest(
    Guid DriverId,
    string OriginCity,
    string DestinationCity,
    decimal OriginLatitude,
    decimal OriginLongitude,
    decimal DestinationLatitude,
    decimal DestinationLongitude,
    DateTime AvailableFrom,
    DateTime AvailableUntil,
    VehicleSize VehicleSize,
    int CapacityKg,
    decimal DiscountPercentage,
    string? Remarks
);

public record ReturnLoadDto(
    Guid Id,
    Guid DriverId,
    string DriverName,
    string DriverPhone,
    string VehiclePlateNumber,
    string OriginCity,
    string DestinationCity,
    DateTime AvailableFrom,
    DateTime AvailableUntil,
    VehicleSize VehicleSize,
    int CapacityKg,
    decimal DiscountPercentage,
    bool IsBooked,
    string? Remarks
);
