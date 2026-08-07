using TruckMe.Domain.Entities;

namespace TruckMe.Domain.Interfaces;

public interface IBookingRepository : IGenericRepository<Booking>
{
    /// <summary>Returns all bookings placed by a specific customer.</summary>
    Task<IEnumerable<Booking>> GetByCustomerIdAsync(Guid customerId);

    /// <summary>Returns all bookings assigned to a specific driver.</summary>
    Task<IEnumerable<Booking>> GetByDriverIdAsync(Guid driverId);

    /// <summary>
    /// Returns a single booking with all related data eagerly loaded:
    /// DeliveryStops, Payment, Review, Customer, Driver.
    /// </summary>
    Task<Booking?> GetWithDetailsAsync(Guid bookingId);
}
