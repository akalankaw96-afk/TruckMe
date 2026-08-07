// Common/Interfaces/ITokenService.cs
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Common.Interfaces;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface ITokenService
{
    string GenerateToken(User user);
    TokenResult GenerateTokenResult(User user);
}
