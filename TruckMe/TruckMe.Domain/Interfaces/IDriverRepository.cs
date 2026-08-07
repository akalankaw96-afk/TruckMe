using TruckMe.Domain.Entities;

namespace TruckMe.Domain.Interfaces;

public interface IDriverRepository : IGenericRepository<Driver>
{
    /// <summary>
    /// Returns all online, available drivers within the given radius
    /// of the supplied coordinates.
    /// </summary>
    Task<IEnumerable<Driver>> GetAvailableDriversAsync(
        decimal latitude,
        decimal longitude,
        double radiusKm);

    /// <summary>Returns the driver profile linked to the given user account.</summary>
    Task<Driver?> GetByUserIdAsync(Guid userId);

    /// <summary>Updates only the real-time GPS coordinates of a driver.</summary>
    Task UpdateLocationAsync(Guid driverId, decimal latitude, decimal longitude);
}

