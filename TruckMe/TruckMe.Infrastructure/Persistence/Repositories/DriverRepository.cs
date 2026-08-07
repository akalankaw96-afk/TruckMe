// TruckMe.Infrastructure/Persistence/Repositories/DriverRepository.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;

namespace TruckMe.Infrastructure.Persistence.Repositories;

public class DriverRepository : GenericRepository<Driver>, IDriverRepository
{
    public DriverRepository(TruckMeDbContext context) : base(context) { }

    /// <summary>
    /// Returns the Driver profile linked to the given user account.
    /// </summary>
    public async Task<Driver?> GetByUserIdAsync(Guid userId)
        => await _dbSet.FirstOrDefaultAsync(d => d.UserId == userId);

    /// <summary>
    /// Returns all online drivers whose current GPS position falls within
    /// <paramref name="radiusKm"/> kilometres of the supplied coordinates.
    ///
    /// Strategy:
    ///   1. A bounding-box pre-filter is executed in SQL to reduce the
    ///      row set returned to the application tier.
    ///   2. An exact Haversine check is then applied in memory to
    ///      eliminate the small number of false positives that the
    ///      rectangular bounding box introduces at the edges.
    /// </summary>
    public async Task<IEnumerable<Driver>> GetAvailableDriversAsync(
        decimal latitude,
        decimal longitude,
        double radiusKm)
    {
        double latDouble = (double)latitude;
        double lonDouble = (double)longitude;

        // Approximate degree deltas for the bounding box
        double latDelta = radiusKm / 111.0;
        double lonDelta = radiusKm / (111.0 * Math.Cos(latDouble * Math.PI / 180.0));

        double minLat = latDouble - latDelta;
        double maxLat = latDouble + latDelta;
        double minLon = lonDouble - lonDelta;
        double maxLon = lonDouble + lonDelta;

        // Step 1 – coarse DB filter (bounding box + online status)
        var candidates = await _dbSet
            .Where(d =>
                d.IsOnline &&
                d.Status == DriverStatus.Online &&
                (double)d.CurrentLatitude >= minLat &&
                (double)d.CurrentLatitude <= maxLat &&
                (double)d.CurrentLongitude >= minLon &&
                (double)d.CurrentLongitude <= maxLon)
            .AsNoTracking()
            .ToListAsync();

        // Step 2 – exact Haversine filter in memory, ordered by distance
        return candidates
            .Select(d => new
            {
                Driver = d,
                DistanceKm = HaversineKm(
                    latDouble, lonDouble,
                    (double)d.CurrentLatitude,
                    (double)d.CurrentLongitude)
            })
            .Where(x => x.DistanceKm <= radiusKm)
            .OrderBy(x => x.DistanceKm)
            .Select(x => x.Driver)
            .ToList();
    }

    /// <summary>
    /// Updates the driver's recorded GPS position and timestamps the change.
    /// The caller is responsible for calling SaveChangesAsync to persist.
    /// </summary>
    public async Task UpdateLocationAsync(Guid driverId, decimal lat, decimal lng)
    {
        var driver = await _dbSet.FindAsync(driverId);
        if (driver is null) return;

        driver.CurrentLatitude = lat;
        driver.CurrentLongitude = lng;
        driver.LastLocationUpdate = DateTime.UtcNow;
    }

    // ── Haversine helper ─────────────────────────────────────────────────

    private static double HaversineKm(
        double lat1, double lon1,
        double lat2, double lon2)
    {
        const double EarthRadiusKm = 6371.0;

        double dLat = ToRadians(lat2 - lat1);
        double dLon = ToRadians(lon2 - lon1);

        double a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));

        return EarthRadiusKm * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
