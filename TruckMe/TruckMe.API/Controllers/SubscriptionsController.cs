using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Subscriptions.GetSubscriptionPlans;
using TruckMe.Application.Features.Subscriptions.GetUserSubscription;
using TruckMe.Application.Features.Subscriptions.SubscribeUser;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SubscriptionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Fetches all active business subscription plans (Starter Business, Enterprise Logistics).
    /// </summary>
    [HttpGet("plans")]
    public async Task<ActionResult<List<SubscriptionPlanDto>>> GetPlans()
    {
        var result = await _mediator.Send(new GetSubscriptionPlansQuery());
        return Ok(result);
    }

    /// <summary>
    /// Subscribes a business customer to a premium membership plan.
    /// </summary>
    [HttpPost("subscribe")]
    public async Task<ActionResult<UserSubscriptionResponse>> Subscribe([FromBody] SubscribeUserRequest request)
    {
        var result = await _mediator.Send(new SubscribeUserCommand
        {
            UserId = request.UserId,
            SubscriptionPlanId = request.SubscriptionPlanId
        });

        if (result == null) return BadRequest("Invalid user or subscription plan.");
        return Ok(result);
    }

    /// <summary>
    /// Gets active subscription status and benefits for a user.
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<ActionResult<UserSubscriptionResponse>> GetUserSubscription(Guid userId)
    {
        var result = await _mediator.Send(new GetUserSubscriptionQuery { UserId = userId });
        if (result == null) return NotFound("Active subscription not found for user.");
        return Ok(result);
    }
}
