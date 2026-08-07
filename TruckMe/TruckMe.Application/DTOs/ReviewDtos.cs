// DTOs/ReviewDtos.cs
namespace TruckMe.Application.DTOs;

public record ReviewResponse(
    Guid Id,
    Guid BookingId,
    Guid CustomerId,
    string CustomerName,
    Guid DriverId,
    string DriverName,
    int Rating,
    string? Comment,
    int PunctualityRating,
    int ProfessionalismRating,
    int VehicleConditionRating,
    int ServiceRating,
    DateTime CreatedAt
);

public record SubmitReviewRequest(
    Guid BookingId,
    int Rating,
    string? Comment,
    int PunctualityRating,
    int ProfessionalismRating,
    int VehicleConditionRating,
    int ServiceRating
);
