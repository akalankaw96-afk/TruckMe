using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Drivers.GetDriverEarnings;

public record GetDriverEarningsQuery : IRequest<DriverEarningsDto>
{
    public Guid DriverId { get; init; }
}
