using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Routes.OptimizeRoute;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoutesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RoutesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Calculates optimized sequence for multi-stop delivery routes to reduce travel distance and fuel cost.
    /// </summary>
    [HttpPost("optimize")]
    public async Task<ActionResult<RouteOptimizationResponse>> OptimizeRoute([FromBody] RouteOptimizationRequest request)
    {
        var result = await _mediator.Send(new OptimizeRouteCommand
        {
            OriginLatitude = request.OriginLatitude,
            OriginLongitude = request.OriginLongitude,
            OriginAddress = request.OriginAddress,
            Stops = request.Stops
        });

        return Ok(result);
    }

    /// <summary>
    /// Performs address geocoding using Google Maps API with fallback.
    /// </summary>
    [HttpGet("geocode")]
    public async Task<IActionResult> Geocode([FromQuery] string address, [FromServices] IGeoService geoService)
    {
        if (string.IsNullOrWhiteSpace(address)) return BadRequest(new { message = "Address parameter is required" });
        var coords = await geoService.GeocodeAddressAsync(address);
        if (coords.HasValue)
        {
            return Ok(new { latitude = coords.Value.lat, longitude = coords.Value.lon, formattedAddress = address });
        }
        return NotFound(new { message = "Location not found" });
    }

    /// <summary>
    /// Performs reverse geocoding for latitude/longitude coordinates.
    /// </summary>
    [HttpGet("reverse-geocode")]
    public async Task<IActionResult> ReverseGeocode([FromQuery] decimal lat, [FromQuery] decimal lng, [FromServices] IGeoService geoService)
    {
        var formatted = await geoService.ReverseGeocodeAsync(lat, lng);
        return Ok(new { formattedAddress = formatted ?? $"{lat:F4}, {lng:F4}" });
    }
}
