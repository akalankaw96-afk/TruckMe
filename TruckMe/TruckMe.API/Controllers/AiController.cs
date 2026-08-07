using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Ai.RecommendVehicle;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IMediator _mediator;

    public AiController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// AI-driven smart recommendation engine for optimal vehicle selection, truck count, and cargo handling.
    /// </summary>
    [HttpPost("recommend-vehicle")]
    public async Task<ActionResult<AiVehicleRecommendationResponse>> RecommendVehicle([FromBody] AiVehicleRecommendationRequest request)
    {
        var result = await _mediator.Send(new RecommendVehicleQuery
        {
            WeightKg = request.WeightKg,
            VolumeCbm = request.VolumeCbm,
            LengthMeters = request.LengthMeters,
            WidthMeters = request.WidthMeters,
            HeightMeters = request.HeightMeters,
            CargoType = request.CargoType,
            RequiredHelpers = request.RequiredHelpers
        });

        return Ok(result);
    }
}
