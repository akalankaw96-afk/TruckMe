using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Reviews.SubmitReview;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/ratings")]
public class ReviewsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReviewsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Submits ratings and reviews for driver, vehicle condition, punctuality, and service quality.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReviewResponse>> SubmitReview([FromBody] CustomerRatingRequest request)
    {
        int overall = (request.DriverRating + request.VehicleConditionRating + request.ServiceQualityRating + request.PunctualityRating) / 4;
        if (overall < 1) overall = 5;

        var command = new SubmitReviewCommand
        {
            BookingId = request.BookingId,
            CustomerId = request.CustomerUserId,
            Rating = overall,
            Comment = request.Comment,
            PunctualityRating = request.PunctualityRating,
            ProfessionalismRating = request.DriverRating,
            VehicleConditionRating = request.VehicleConditionRating,
            ServiceRating = request.ServiceQualityRating
        };

        var result = await _mediator.Send(command);
        return Ok(result);
    }
}

public class CustomerRatingRequest
{
    public Guid BookingId { get; set; }
    public Guid CustomerUserId { get; set; }
    public int DriverRating { get; set; }
    public int VehicleConditionRating { get; set; }
    public int ServiceQualityRating { get; set; }
    public int PunctualityRating { get; set; }
    public string? Comment { get; set; }
    public string? Tags { get; set; }
    public bool IsAnonymous { get; set; }
}
