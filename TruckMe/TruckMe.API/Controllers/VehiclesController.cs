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
    /// Registers or updates a truck or transport vehicle for a driver.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateVehicle([FromBody] CreateVehicleDto dto)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
        if (driver == null)
        {
            return BadRequest(new { message = "Driver profile not found" });
        }

        string plate = !string.IsNullOrWhiteSpace(dto.RegistrationNumber) ? dto.RegistrationNumber : (!string.IsNullOrWhiteSpace(dto.PlateNumber) ? dto.PlateNumber : "WP-CAB-8899");
        string make = !string.IsNullOrWhiteSpace(dto.Make) ? dto.Make : "Isuzu";
        string model = !string.IsNullOrWhiteSpace(dto.Model) ? dto.Model : "Elf";
        string vehicleTypeName = $"{make} {model}";

        driver.VehiclePlateNumber = plate;

        var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.DriverId == driver.Id || v.DriverId == driver.UserId);
        if (vehicle == null)
        {
            vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                DriverId = driver.Id,
                PlateNumber = plate,
                VehicleType = vehicleTypeName,
                CapacityKg = dto.CapacityKg > 0 ? dto.CapacityKg : 1000,
                ApprovalStatus = "Approved",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Vehicles.Add(vehicle);
        }
        else
        {
            vehicle.PlateNumber = plate;
            vehicle.VehicleType = vehicleTypeName;
            vehicle.CapacityKg = dto.CapacityKg > 0 ? dto.CapacityKg : vehicle.CapacityKg;
            vehicle.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(vehicle.Id);
    }

    /// <summary>
    /// Gets all vehicles registered under a specific driver.
    /// </summary>
    [HttpGet("driver/{driverId:guid}")]
    [HttpGet("{driverId:guid}")]
    public async Task<ActionResult<List<object>>> GetDriverVehicles(Guid driverId)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == driverId || d.UserId == driverId);

        var vehicles = await _context.Vehicles
            .AsNoTracking()
            .Where(v => driver != null && (v.DriverId == driver.Id || v.DriverId == driver.UserId))
            .ToListAsync();

        if (vehicles.Any())
        {
            return Ok(vehicles.Select(v => {
                string vType = v.VehicleType ?? "Truck";
                string[] parts = vType.Split(' ', 2);
                string make = parts.Length > 0 ? parts[0] : "";
                string model = parts.Length > 1 ? parts[1] : "";
                return new
                {
                    id = v.Id,
                    driverId = v.DriverId,
                    registrationNumber = v.PlateNumber,
                    make = make,
                    model = model,
                    year = 2023,
                    color = "White",
                    capacityKg = v.CapacityKg > 0 ? (int)v.CapacityKg : 1000,
                    approvalStatus = v.ApprovalStatus ?? "Approved",
                    vehicleTypeName = v.VehicleType ?? $"{make} {model}".Trim()
                };
            }).ToList());
        }

        // If driver has registered plate number on profile
        if (driver != null && !string.IsNullOrWhiteSpace(driver.VehiclePlateNumber))
        {
            string vTypeStr = driver.VehicleType.ToString();
            return Ok(new List<object>
            {
                new
                {
                    id = Guid.NewGuid(),
                    driverId = driver.Id,
                    registrationNumber = driver.VehiclePlateNumber,
                    make = vTypeStr,
                    model = "Truck",
                    year = 2023,
                    color = "White",
                    capacityKg = 1000,
                    approvalStatus = "Approved",
                    vehicleTypeName = vTypeStr
                }
            });
        }

        // Driver has not assigned/registered any vehicle yet
        return Ok(new List<object>());
    }
}

public class CreateVehicleDto
{
    public Guid DriverId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string PlateNumber { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public double CapacityKg { get; set; }
}
