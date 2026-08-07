// Common/Interfaces/ICurrentUserService.cs
namespace TruckMe.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string UserRole { get; }
    bool IsAuthenticated { get; }
}
