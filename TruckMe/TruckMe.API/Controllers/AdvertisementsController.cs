using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Advertisements.CreateAdvertisement;
using TruckMe.Application.Features.Advertisements.GetActiveAdvertisements;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdvertisementsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdvertisementsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Fetches active targeted advertisement banners for Customer and Transport Provider applications.
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<List<AdvertisementDto>>> GetActiveAds([FromQuery] string audience = "All")
    {
        var result = await _mediator.Send(new GetActiveAdvertisementsQuery { Audience = audience });
        return Ok(result);
    }

    /// <summary>
    /// Creates a promotional banner ad campaign (Platform Admin / Partner).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AdvertisementDto>> CreateAd([FromBody] CreateAdvertisementRequest request)
    {
        var result = await _mediator.Send(new CreateAdvertisementCommand
        {
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            TargetUrl = request.TargetUrl,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TargetAudience = request.TargetAudience
        });

        return Ok(result);
    }
}
