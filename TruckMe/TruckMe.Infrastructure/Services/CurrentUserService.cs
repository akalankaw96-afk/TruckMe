// TruckMe.Infrastructure/Services/CurrentUserService.cs
// Requires NuGet: dotnet add src/TruckMe.Infrastructure package Microsoft.AspNetCore.Http.Abstractions

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.Infrastructure.Services;

/// <summary>
/// Resolves the identity of the currently authenticated user by inspecting
/// the claims on the HTTP request's principal.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// The authenticated user's unique identifier, or null for anonymous requests.
    /// </summary>
    public Guid? UserId
    {
        get
        {
            string? value = _httpContextAccessor.HttpContext?
                .User
                .FindFirstValue(ClaimTypes.NameIdentifier);

            return Guid.TryParse(value, out Guid id) ? id : null;
        }
    }

    /// <summary>
    /// The string representation of the authenticated user's role claim,
    /// or an empty string when no role claim is present.
    /// </summary>
    public string UserRole =>
        _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.Role)
        ?? string.Empty;

    /// <summary>
    /// True when the HTTP context carries an authenticated identity.
    /// </summary>
    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?
            .User
            .Identity?
            .IsAuthenticated == true;
}
