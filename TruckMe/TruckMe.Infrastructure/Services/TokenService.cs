// TruckMe.Infrastructure/Services/TokenService.cs
// Requires NuGet: dotnet add src/TruckMe.Infrastructure package System.IdentityModel.Tokens.Jwt

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Generates a signed JWT for the supplied user.
    /// Configuration keys expected in appsettings.json:
    ///   Jwt:Key         — HMAC-SHA256 signing secret (≥ 32 characters)
    ///   Jwt:Issuer      — token issuer URI
    ///   Jwt:Audience    — intended audience URI
    ///   Jwt:ExpiryMinutes — lifetime in minutes (default: 1440 = 24 h)
    /// </summary>
    public string GenerateToken(User user)
    {
        return GenerateTokenResult(user).Token;
    }

    public TokenResult GenerateTokenResult(User user)
    {
        string key = _configuration["Jwt:Key"] ?? "TruckMeSuperSecretJWTKey2026SriLankaPlatform!";
        string issuer = _configuration["Jwt:Issuer"] ?? "TruckMeAPI";
        string audience = _configuration["Jwt:Audience"] ?? "TruckMeUsers";
        int expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out int parsed) ? parsed : 1440;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name,            user.FullName),
            new Claim(ClaimTypes.Email,           user.Email),
            new Claim(ClaimTypes.Role,            user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var symmetricKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var signingCredentials = new SigningCredentials(symmetricKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: signingCredentials);

        string tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return new TokenResult(tokenString, token.ValidTo);
    }
}
