// DTOs/DeliveryStopDto.cs
namespace TruckMe.Application.DTOs;

public record DeliveryStopDto(
    string Address,
    decimal Latitude,
    decimal Longitude,
    string RecipientName,
    string RecipientPhone,
    string? Notes = null
);
