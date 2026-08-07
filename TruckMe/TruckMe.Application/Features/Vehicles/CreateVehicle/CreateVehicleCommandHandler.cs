using MediatR;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Vehicles.CreateVehicle;

public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Guid>
{
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IApplicationDbContext _context;

    public CreateVehicleCommandHandler(IVehicleRepository vehicleRepository, IApplicationDbContext context)
    {
        _vehicleRepository = vehicleRepository;
        _context = context;
    }

    public async Task<Guid> Handle(CreateVehicleCommand request, CancellationToken cancellationToken)
    {
        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            DriverId = request.DriverId,
            PlateNumber = request.PlateNumber,
            Size = request.Size,
            Model = request.Model,
            CapacityKg = request.CapacityKg,
            LengthMeters = request.LengthMeters,
            WidthMeters = request.WidthMeters,
            HeightMeters = request.HeightMeters,
            ImageUrl = request.ImageUrl,
            Status = VehicleStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _vehicleRepository.AddAsync(vehicle);
        await _context.SaveChangesAsync(cancellationToken);

        return vehicle.Id;
    }
}
