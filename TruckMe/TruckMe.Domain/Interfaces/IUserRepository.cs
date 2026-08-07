using TruckMe.Domain.Entities;

namespace TruckMe.Domain.Interfaces;

public interface IUserRepository : IGenericRepository<User>
{
    /// <summary>Looks up a user by their unique e-mail address.</summary>
    Task<User?> GetByEmailAsync(string email);

    /// <summary>Looks up a user by their phone number.</summary>
    Task<User?> GetByPhoneNumberAsync(string phone);
}
