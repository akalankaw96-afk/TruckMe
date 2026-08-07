// Features/Drivers/AcceptJob/AcceptJobCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;

namespace TruckMe.Application.Features.Drivers.AcceptJob;

public record AcceptJobCommand : IRequest<Result>
{
    public Guid DriverId { get; init; }
    public Guid BookingId { get; init; }
}
