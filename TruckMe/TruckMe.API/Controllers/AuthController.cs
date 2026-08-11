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
        try
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (TruckMe.Application.Common.Exceptions.ValidationException ex)
        {
            var errors = ex.Errors.SelectMany(kvp => kvp.Value).ToList();
            string errorMsg = errors.Count > 0 ? string.Join(" ", errors) : "Validation failure";
            return BadRequest(new { message = errorMsg, errors = ex.Errors });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Authenticates a user and returns a JWT Bearer token.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginQuery query)
    {
        try
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (TruckMe.Application.Common.Exceptions.ValidationException ex)
        {
            var errors = ex.Errors.SelectMany(kvp => kvp.Value).ToList();
            string errorMsg = errors.Count > 0 ? string.Join(" ", errors) : "Invalid credentials";
            return BadRequest(new { message = errorMsg, errors = ex.Errors });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

        await context.SaveChangesAsync();
        return Ok(new { message = "Push token saved successfully" });
    }

    private static readonly Dictionary<string, string> _resetOtps = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Generates a 6-digit OTP verification code for password reset.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, [FromServices] TruckMe.Application.Common.Interfaces.IApplicationDbContext context)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email address or phone number is required" });

        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Users, u => u.Email == dto.Email.Trim().ToLower() || u.PhoneNumber == dto.Email.Trim());
        if (user == null)
        {
            return BadRequest(new { message = "No account found with this email address or phone number" });
        }

        string otpCode = new Random().Next(100000, 999999).ToString();
        _resetOtps[user.Email] = otpCode;

        return Ok(new
        {
            message = $"Verification code sent to {user.Email}. (Demo OTP Code: {otpCode})",
            otpCode = otpCode,
            email = user.Email
        });
    }

    /// <summary>
    /// Resets user password using the 6-digit OTP verification code.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, [FromServices] TruckMe.Application.Common.Interfaces.IApplicationDbContext context)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.OtpCode) || string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest(new { message = "Email, OTP verification code, and new password are required" });

        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(context.Users, u => u.Email == dto.Email.Trim().ToLower());
        if (user == null)
            return BadRequest(new { message = "Account not found" });

        if (!_resetOtps.TryGetValue(user.Email, out var validOtp) || validOtp != dto.OtpCode.Trim())
        {
            return BadRequest(new { message = "Invalid or expired OTP verification code" });
        }

        if (dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await context.SaveChangesAsync();
        _resetOtps.Remove(user.Email);

        return Ok(new
        {
            message = "Password reset successfully! You can now sign in with your new password.",
            email = user.Email
        });
    }
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class PushTokenRegistrationDto
{
    public Guid UserId { get; set; }
    public string PushToken { get; set; } = string.Empty;
}
