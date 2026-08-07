using Microsoft.AspNetCore.Mvc;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleTypesController : ControllerBase
{
    [HttpGet]
    public IActionResult GetVehicleTypes()
    {
        var types = new[]
        {
            new
            {
                id = "mini-truck",
                name = "Mini Truck",
                code = "MINI",
                category = "Dry",
                description = "Ideal for light cargo, household items & small deliveries",
                basePrice = 2500,
                pricePerKm = 120,
                minCapacityKg = 100,
                maxCapacityKg = 500
            },
            new
            {
                id = "1ton-truck",
                name = "1 Ton Truck",
                code = "1TON",
                category = "Dry",
                description = "Perfect for retail supply & medium weight transport",
                basePrice = 4000,
                pricePerKm = 160,
                minCapacityKg = 500,
                maxCapacityKg = 1000
            },
            new
            {
                id = "2ton-truck",
                name = "2 Ton Truck",
                code = "2TON",
                category = "Dry",
                description = "Spacious payload for wholesale distribution & house moves",
                basePrice = 6500,
                pricePerKm = 220,
                minCapacityKg = 1000,
                maxCapacityKg = 2000
            },
            new
            {
                id = "3ton-truck",
                name = "3 Ton Truck",
                code = "3TON",
                category = "Dry",
                description = "Heavy distribution lorry for FMCG & commercial goods",
                basePrice = 9000,
                pricePerKm = 280,
                minCapacityKg = 2000,
                maxCapacityKg = 3000
            },
            new
            {
                id = "5ton-truck",
                name = "5 Ton Heavy Lorry",
                code = "5TON",
                category = "Dry",
                description = "Large capacity for manufacturing & factory dispatches",
                basePrice = 14000,
                pricePerKm = 360,
                minCapacityKg = 3000,
                maxCapacityKg = 5000
            },
            new
            {
                id = "freezer-truck",
                name = "Freezer Truck (-18°C)",
                code = "FREEZER",
                category = "Temperature Controlled",
                description = "Frozen foods, seafood, ice cream & temperature sensitive cargo",
                basePrice = 15000,
                pricePerKm = 400,
                minCapacityKg = 1000,
                maxCapacityKg = 5000
            },
            new
            {
                id = "chiller-truck",
                name = "Chiller Truck (2°C - 8°C)",
                code = "CHILLER",
                category = "Temperature Controlled",
                description = "Dairy products, fresh meat, fruits & pharmaceuticals",
                basePrice = 12000,
                pricePerKm = 350,
                minCapacityKg = 1000,
                maxCapacityKg = 4000
            }
        };

        return Ok(types);
    }
}
