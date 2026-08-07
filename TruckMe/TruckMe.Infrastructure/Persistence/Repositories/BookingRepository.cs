// TruckMe.Infrastructure/Persistence/Repositories/BookingRepository.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;

namespace TruckMe.Infrastructure.Persistence.Repositories;

public class BookingRepository : GenericRepository<Booking>, IBookingRepository
{
    public BookingRepository(TruckMeDbContext context) : base(context) { }

    /// <summary>
    /// Returns all bookings placed by a specific customer,
    /// most recent first. Read-only (no tracking).
    /// </summary>
    public async Task<IEnumerable<Booking>> GetByCustomerIdAsync(Guid customerId)
        => await _dbSet
            .Where(b => b.CustomerId == customerId)
            .OrderByDescending(b => b.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

    /// <summary>
    /// Returns all bookings assigned to a specific driver,
    /// most recent first. Read-only (no tracking).
    /// </summary>
    public async Task<IEnumerable<Booking>> GetByDriverIdAsync(Guid driverId)
        => await _dbSet
            .Where(b => b.DriverId == driverId)
            .OrderByDescending(b => b.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

    /// <summary>
    /// Returns a fully-hydrated Booking including all navigation properties.
    /// Delivery stops are ordered by their sequence number.
    ///
    /// Change-tracking is left ON so that callers (e.g. command handlers
    /// that update booking state) can modify the returned entity and persist
    /// via SaveChangesAsync without re-attaching it.
    /// </summary>
    public async Task<Booking?> GetWithDetailsAsync(Guid bookingId)
        => await _dbSet
            .Include(b => b.DeliveryStops.OrderBy(ds => ds.Sequence))
            .Include(b => b.Payment)
            .Include(b => b.Review)
            .Include(b => b.Customer)
            .Include(b => b.Driver)
                .ThenInclude(d => d!.User)   // d is nullable; ! suppresses CS8602
            .FirstOrDefaultAsync(b => b.Id == bookingId);
}
