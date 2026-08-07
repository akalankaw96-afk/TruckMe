// Features/Drivers/UpdateDriverStatus/UpdateDriverStatusCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;

namespace TruckMe.Application.Features.Drivers.UpdateDriverStatus;

public record UpdateDriverStatusCommand : IRequest<Result>
{
    public Guid DriverId { get; init; }
    public bool IsOnline { get; init; }
}
