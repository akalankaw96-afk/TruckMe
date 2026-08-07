// TruckMe.Infrastructure/Persistence/Repositories/UserRepository.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;

namespace TruckMe.Infrastructure.Persistence.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(TruckMeDbContext context) : base(context) { }

    /// <summary>
    /// Looks up a user by their unique e-mail address.
    /// Returns null when no match is found.
    /// </summary>
    public async Task<User?> GetByEmailAsync(string email)
        => await _dbSet.FirstOrDefaultAsync(u => u.Email == email);

    /// <summary>
    /// Looks up a user by their mobile phone number.
    /// Returns null when no match is found.
    /// </summary>
    public async Task<User?> GetByPhoneNumberAsync(string phone)
        => await _dbSet.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
}
