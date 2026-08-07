// Features/DeliveryStops/UpdateStopStatusCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.DeliveryStops;

public record UpdateStopStatusCommand : IRequest<Result>
{
    public Guid BookingId { get; init; }
    public int StopSequence { get; init; }
    public DeliveryStopStatus NewStatus { get; init; }
}
