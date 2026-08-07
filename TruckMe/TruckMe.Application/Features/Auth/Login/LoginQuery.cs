// Features/Auth/Login/LoginQuery.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Auth.Login;

public record LoginQuery : IRequest<AuthResponse>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
