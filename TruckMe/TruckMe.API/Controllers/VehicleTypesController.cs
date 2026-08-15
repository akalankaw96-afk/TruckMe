using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;

namespace TruckMe.API.Controllers;

public class VehicleTypeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = "Dry";
    public string Description { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal PricePerKm { get; set; }
    public int MinCapacityKg { get; set; }
    public int MaxCapacityKg { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class VehicleTypesController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, VehicleTypeDto> _vehicleTypes = new(new Dictionary<string, VehicleTypeDto>
    {
        ["mini-truck"] = new VehicleTypeDto
        {
            Id = "mini-truck",
            Name = "Mini Truck",
            Code = "MINI",
            Category = "Dry",
            Description = "Ideal for light cargo, household items & small deliveries",
            BasePrice = 2500,
            PricePerKm = 120,
            MinCapacityKg = 100,
            MaxCapacityKg = 500
        },
        ["1ton-truck"] = new VehicleTypeDto
        {
            Id = "1ton-truck",
            Name = "1 Ton Truck",
            Code = "1TON",
            Category = "Dry",
            Description = "Perfect for retail supply & medium weight transport",
            BasePrice = 4000,
            PricePerKm = 160,
            MinCapacityKg = 500,
            MaxCapacityKg = 1000
        },
        ["2ton-truck"] = new VehicleTypeDto
        {
            Id = "2ton-truck",
            Name = "2 Ton Truck",
            Code = "2TON",
            Category = "Dry",
            Description = "Spacious payload for wholesale distribution & house moves",
            BasePrice = 6500,
            PricePerKm = 220,
            MinCapacityKg = 1000,
            MaxCapacityKg = 2000
        },
        ["3ton-truck"] = new VehicleTypeDto
        {
            Id = "3ton-truck",
            Name = "3 Ton Truck",
            Code = "3TON",
            Category = "Dry",
            Description = "Heavy distribution lorry for FMCG & commercial goods",
            BasePrice = 9000,
            PricePerKm = 280,
            MinCapacityKg = 2000,
            MaxCapacityKg = 3000
        },
        ["5ton-truck"] = new VehicleTypeDto
        {
            Id = "5ton-truck",
            Name = "5 Ton Heavy Lorry",
            Code = "5TON",
            Category = "Dry",
            Description = "Large capacity for manufacturing & factory dispatches",
            BasePrice = 14000,
            PricePerKm = 360,
            MinCapacityKg = 3000,
            MaxCapacityKg = 5000
        },
        ["freezer-truck"] = new VehicleTypeDto
        {
            Id = "freezer-truck",
            Name = "Freezer Truck (-18°C)",
            Code = "FREEZER",
            Category = "Temperature Controlled",
            Description = "Frozen foods, seafood, ice cream & temperature sensitive cargo",
            BasePrice = 15000,
            PricePerKm = 400,
            MinCapacityKg = 1000,
            MaxCapacityKg = 5000
        },
        ["chiller-truck"] = new VehicleTypeDto
        {
            Id = "chiller-truck",
            Name = "Chiller Truck (2°C - 8°C)",
            Code = "CHILLER",
            Category = "Temperature Controlled",
            Description = "Dairy products, fresh meat, fruits & pharmaceuticals",
            BasePrice = 12000,
            PricePerKm = 350,
            MinCapacityKg = 1000,
            MaxCapacityKg = 4000
        }
    });

    [HttpGet]
    public IActionResult GetVehicleTypes()
    {
        return Ok(_vehicleTypes.Values);
    }

    [HttpPost]
    public IActionResult AddVehicleType([FromBody] VehicleTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Vehicle type name is required." });

        if (string.IsNullOrWhiteSpace(dto.Id))
        {
            dto.Id = dto.Name.ToLowerInvariant().Replace(" ", "-").Replace("°", "").Replace("(", "").Replace(")", "");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            dto.Code = dto.Name.Substring(0, Math.Min(4, dto.Name.Length)).ToUpperInvariant();
        }

        _vehicleTypes[dto.Id] = dto;
        return Ok(new { message = "Vehicle type added successfully!", vehicleType = dto });
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteVehicleType(string id)
    {
        if (_vehicleTypes.TryRemove(id, out var removed))
        {
            return Ok(new { message = $"Vehicle type '{removed.Name}' deleted successfully!" });
        }

        return NotFound(new { message = "Vehicle type not found." });
    }
}
