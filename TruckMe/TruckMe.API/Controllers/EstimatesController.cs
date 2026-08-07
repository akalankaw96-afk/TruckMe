using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Estimates.EstimateBooking;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EstimatesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EstimatesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Calculates instant transport price estimates based on vehicle type, cargo, distance, and add-ons.
    /// </summary>
    [HttpPost("calculate")]
    public async Task<ActionResult<EstimateResponse>> CalculateEstimate([FromBody] EstimateBookingQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
