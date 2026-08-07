// Features/Estimates/EstimateBooking/EstimateBookingQuery.cs
using MediatR;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Estimates.EstimateBooking;

public record EstimateBookingQuery : IRequest<EstimateResponse>
{
    public decimal PickupLatitude { get; init; }
    public decimal PickupLongitude { get; init; }
    public string PickupAddress { get; init; } = string.Empty;
    public List<DeliveryStopDto> Stops { get; init; } = new();
    public CargoType CargoType { get; init; }
    public VehicleSize RequiredVehicleSize { get; init; }
    public bool NeedsHelpers { get; init; }
    public int HelperCount { get; init; }
    public bool NeedsLoading { get; init; }
    public bool NeedsUnloading { get; init; }
    public bool IsExpress { get; init; }
    public bool IsFullDay { get; init; }
}
