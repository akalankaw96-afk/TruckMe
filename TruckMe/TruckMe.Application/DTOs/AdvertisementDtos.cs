namespace TruckMe.Application.DTOs;

public record CreateAdvertisementRequest(
    string Title,
    string Description,
    string ImageUrl,
    string TargetUrl,
    DateTime StartDate,
    DateTime EndDate,
    string TargetAudience
);

public record AdvertisementDto(
    Guid Id,
    string Title,
    string Description,
    string ImageUrl,
    string TargetUrl,
    DateTime StartDate,
    DateTime EndDate,
    string TargetAudience
);
