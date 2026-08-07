using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Users.GetUserProfile;
using TruckMe.Application.Features.Users.UpdateUserProfile;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Gets detailed profile information for a user (Customer or Transport Provider).
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> GetProfile(Guid id)
    {
        var result = await _mediator.Send(new GetUserProfileQuery { UserId = id });
        if (result == null) return NotFound("User not found.");
        return Ok(result);
    }

    /// <summary>
    /// Updates user profile details, including business customer organization fields.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserResponse>> UpdateProfile(Guid id, [FromBody] UpdateProfileRequest request)
    {
        var result = await _mediator.Send(new UpdateUserProfileCommand
        {
            UserId = id,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            ProfileImageUrl = request.ProfileImageUrl,
            CompanyName = request.CompanyName,
            BusinessType = request.BusinessType,
            TaxId = request.TaxId
        });

        if (result == null) return NotFound("User not found.");
        return Ok(result);
    }
}
