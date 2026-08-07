// TruckMe.Infrastructure/Persistence/Repositories/VehicleRepository.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;

namespace TruckMe.Infrastructure.Persistence.Repositories;

public class VehicleRepository : GenericRepository<Vehicle>, IVehicleRepository
{
    public VehicleRepository(TruckMeDbContext context) : base(context) { }

    /// <summary>
    /// Returns all vehicles registered under a specific driver.
    /// Read-only (no tracking).
    /// </summary>
    public async Task<IEnumerable<Vehicle>> GetByDriverIdAsync(Guid driverId)
    {
        return await _dbSet
            .Where(v => v.DriverId == driverId)
            .AsNoTracking()
            .ToListAsync();
    }
}
