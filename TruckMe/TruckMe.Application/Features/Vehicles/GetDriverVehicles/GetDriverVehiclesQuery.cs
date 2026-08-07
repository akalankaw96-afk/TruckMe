using MediatR;
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Features.Vehicles.GetDriverVehicles;

public record GetDriverVehiclesQuery : IRequest<List<Vehicle>>
{
    public Guid DriverId { get; init; }
}
