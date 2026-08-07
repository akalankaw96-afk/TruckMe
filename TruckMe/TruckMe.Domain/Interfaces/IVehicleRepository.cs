using TruckMe.Domain.Entities;

namespace TruckMe.Domain.Interfaces;

public interface IVehicleRepository : IGenericRepository<Vehicle>
{
    /// <summary>Returns all vehicles registered under a specific driver.</summary>
    Task<IEnumerable<Vehicle>> GetByDriverIdAsync(Guid driverId);
}
