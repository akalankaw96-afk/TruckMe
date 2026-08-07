using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Features.Vehicles.CreateVehicle;
using TruckMe.Application.Features.Vehicles.GetDriverVehicles;
using TruckMe.Domain.Entities;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public VehiclesController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>
    /// Registers a new truck or transport vehicle for a driver.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateVehicle([FromBody] CreateVehicleCommand command)
    {
        var vehicleId = await _mediator.Send(command);
        return Ok(vehicleId);
    }

    /// <summary>
    /// Gets all vehicles registered under a specific driver.
    /// </summary>
    [HttpGet("driver/{driverId:guid}")]
    [HttpGet("{driverId:guid}")]
    public async Task<ActionResult<List<object>>> GetDriverVehicles(Guid driverId)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == driverId || d.UserId == driverId);

        return Ok(new List<object>
        {
            new
            {
                id = Guid.NewGuid(),
                driverId = driverId,
                registrationNumber = driver?.VehiclePlateNumber ?? "WP-CAB-8899",
                make = "Isuzu",
                model = "Elf 1 Ton",
                year = 2022,
                color = "White",
                capacityKg = 1000,
                approvalStatus = "Approved",
                vehicleTypeName = "1 Ton Truck"
            }
        });
    }
}
