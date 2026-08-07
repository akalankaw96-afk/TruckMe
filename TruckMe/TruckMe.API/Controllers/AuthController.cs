using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Auth.Login;
using TruckMe.Application.Features.Auth.Register;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Registers a new customer or transport provider (driver).
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Authenticates a user and returns a JWT Bearer token.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Registers or updates an Expo / FCM push notification token for a user or driver.
    /// </summary>
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPushToken(
        [FromBody] PushTokenRegistrationDto dto,
        [FromServices] TruckMe.Application.Common.Interfaces.IApplicationDbContext context)
    {
        if (dto.UserId == Guid.Empty || string.IsNullOrWhiteSpace(dto.PushToken))
        {
            return BadRequest(new { message = "Invalid UserId or PushToken" });
        }

        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Users, u => u.Id == dto.UserId);
        if (user != null)
        {
            user.FcmToken = dto.PushToken;
        }

        var driver = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Drivers, d => d.UserId == dto.UserId || d.Id == dto.UserId);
        if (driver != null)
        {
            driver.FcmToken = dto.PushToken;
        }

        await context.SaveChangesAsync(default);
        return Ok(new { message = "Push token registered successfully" });
    }
}

public class PushTokenRegistrationDto
{
    public Guid UserId { get; set; }
    public string PushToken { get; set; } = string.Empty;
}
