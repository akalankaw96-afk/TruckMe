// Features/Auth/Register/RegisterCommand.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Auth.Register;

public record RegisterCommand : IRequest<AuthResponse>
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Role { get; init; } = "Customer";
}
