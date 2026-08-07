// DTOs/BookingDtos.cs
using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record CreateBookingRequest(
    double PickupLatitude,
    double PickupLongitude,
    string PickupAddress,
    string PickupContactName,
    string PickupContactPhone,
    List<DeliveryStopDto> Stops,
    CargoType CargoType,
    string? CargoDescription,
    double? CargoWeightKg,
    VehicleSize RequiredVehicleSize,
    bool NeedsHelpers,
    int HelperCount,
    bool NeedsLoading,
    bool NeedsUnloading,
    bool IsExpress,
    bool IsFullDay,
    DateTime ScheduledAt,
    PaymentMethod PaymentMethod
);

public record BookingResponse(
    Guid Id,
    Guid CustomerId,
    Guid? DriverId,
    string PickupAddress,
    decimal PickupLatitude,
    decimal PickupLongitude,
    string PickupContactName,
    string PickupContactPhone,
    CargoType CargoType,
    string? CargoDescription,
    double? CargoWeightKg,
    VehicleSize RequiredVehicleSize,
    bool NeedsHelpers,
    int HelperCount,
    bool NeedsLoading,
    bool NeedsUnloading,
    bool IsExpress,
    bool IsFullDay,
    decimal BaseFare,
    decimal DistanceFare,
    decimal StopFare,
    decimal AddOnFare,
    decimal SurgeMultiplier,
    decimal TotalFare,
    decimal Commission,
    decimal DriverPayout,
    decimal TotalDistanceKm,
    int EstimatedDurationMinutes,
    DateTime ScheduledAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    string Status,
    string? CancellationReason,
    List<DeliveryStopResponse> DeliveryStops,
    PaymentResponse? Payment,
    ReviewResponse? Review
);

public record BookingListDto(
    Guid Id,
    string PickupAddress,
    string Status,
    decimal TotalFare,
    DateTime ScheduledAt,
    DateTime? CompletedAt,
    string? DriverName,
    int StopCount
);

public record DeliveryStopResponse(
    Guid Id,
    int Sequence,
    string Address,
    decimal Latitude,
    decimal Longitude,
    string RecipientName,
    string RecipientPhone,
    string? Notes,
    string Status,
    DateTime? ArrivedAt,
    DateTime? CompletedAt
);
