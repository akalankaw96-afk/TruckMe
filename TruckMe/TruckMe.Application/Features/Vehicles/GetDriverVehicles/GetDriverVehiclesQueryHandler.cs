using MediatR;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Vehicles.GetDriverVehicles;

public class GetDriverVehiclesQueryHandler : IRequestHandler<GetDriverVehiclesQuery, List<Vehicle>>
{
    private readonly IVehicleRepository _vehicleRepository;

    public GetDriverVehiclesQueryHandler(IVehicleRepository vehicleRepository)
    {
        _vehicleRepository = vehicleRepository;
    }

    public async Task<List<Vehicle>> Handle(GetDriverVehiclesQuery request, CancellationToken cancellationToken)
    {
        var vehicles = await _vehicleRepository.GetByDriverIdAsync(request.DriverId);
        return vehicles.ToList();
    }
}
