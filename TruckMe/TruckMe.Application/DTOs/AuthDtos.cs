// DTOs/AuthDtos.cs
namespace TruckMe.Application.DTOs;

public record RegisterRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    string Password,
    string Role = "Customer"
);

public record AuthResponse(
    string Token,
    DateTime ExpiresAt,
    Guid UserId,
    string FullName,
    string Email,
    string Role
);
