// DTOs/DriverDtos.cs
using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record DriverResponse(
    Guid Id,
    Guid UserId,
    string FullName,
    string PhoneNumber,
    string LicenseNumber,
    string VehiclePlateNumber,
    string VehicleType,
    bool IsOnline,
    string Status,
    decimal RatingAverage,
    int TotalRatings,
    int TotalCompletedJobs,
    decimal TotalEarnings,
    double CurrentLatitude,
    double CurrentLongitude,
    string? ProfileImageUrl
);

public record AvailableJobDto(
    Guid BookingId,
    string PickupAddress,
    decimal PickupLatitude,
    decimal PickupLongitude,
    decimal DistanceFromDriverKm,
    decimal TotalFare,
    VehicleSize RequiredVehicleSize,
    CargoType CargoType,
    int StopCount,
    DateTime ScheduledAt
);

public record UpdateLocationRequest(
    decimal Latitude,
    decimal Longitude
);

public record UpdateDriverStatusRequest(
    bool IsOnline
);

public record DriverEarningsDto(
    decimal TodayEarnings,
    decimal WeekEarnings,
    decimal TotalEarnings,
    int CompletedJobsToday,
    int CompletedJobsThisWeek,
    decimal AverageRating
);
