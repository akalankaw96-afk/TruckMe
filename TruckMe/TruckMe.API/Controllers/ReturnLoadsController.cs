using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.ReturnLoads.CreateReturnLoad;
using TruckMe.Application.Features.ReturnLoads.SearchReturnLoads;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReturnLoadsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReturnLoadsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Posts a return load availability listing for transport providers to boost vehicle utilization.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReturnLoadDto>> CreateReturnLoad([FromBody] CreateReturnLoadRequest request)
    {
        var result = await _mediator.Send(new CreateReturnLoadCommand
        {
            DriverId = request.DriverId,
            OriginCity = request.OriginCity,
            DestinationCity = request.DestinationCity,
            OriginLatitude = request.OriginLatitude,
            OriginLongitude = request.OriginLongitude,
            DestinationLatitude = request.DestinationLatitude,
            DestinationLongitude = request.DestinationLongitude,
            AvailableFrom = request.AvailableFrom,
            AvailableUntil = request.AvailableUntil,
            VehicleSize = request.VehicleSize,
            CapacityKg = request.CapacityKg,
            DiscountPercentage = request.DiscountPercentage,
            Remarks = request.Remarks
        });

        if (result == null) return BadRequest("Invalid driver specified.");
        return Ok(result);
    }

    /// <summary>
    /// Searches available discounted return load transport options.
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<ReturnLoadDto>>> Search([FromQuery] string? originCity, [FromQuery] string? destinationCity, [FromQuery] VehicleSize? vehicleSize)
    {
        var result = await _mediator.Send(new SearchReturnLoadsQuery
        {
            OriginCity = originCity,
            DestinationCity = destinationCity,
            VehicleSize = vehicleSize
        });

        return Ok(result);
    }
}
