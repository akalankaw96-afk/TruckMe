using MediatR;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Vehicles.CreateVehicle;

public record CreateVehicleCommand : IRequest<Guid>
{
    public Guid DriverId { get; init; }
    public string PlateNumber { get; init; } = string.Empty;
    public VehicleSize Size { get; init; }
    public string Model { get; init; } = string.Empty;
    public int CapacityKg { get; init; }
    public double? LengthMeters { get; init; }
    public double? WidthMeters { get; init; }
    public double? HeightMeters { get; init; }
    public string? ImageUrl { get; init; }
}
