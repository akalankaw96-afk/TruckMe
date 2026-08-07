// Features/Drivers/UpdateLocation/UpdateDriverLocationCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;

namespace TruckMe.Application.Features.Drivers.UpdateLocation;

public record UpdateDriverLocationCommand : IRequest<Result>
{
    public Guid DriverId { get; init; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
}
