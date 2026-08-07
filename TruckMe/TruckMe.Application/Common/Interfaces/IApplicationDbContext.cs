// Common/Interfaces/IApplicationDbContext.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Driver> Drivers { get; }
    DbSet<Vehicle> Vehicles { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<DeliveryStop> DeliveryStops { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Review> Reviews { get; }
    DbSet<Address> Addresses { get; }
    DbSet<SubscriptionPlan> SubscriptionPlans { get; }
    DbSet<UserSubscription> UserSubscriptions { get; }
    DbSet<ReturnLoad> ReturnLoads { get; }
    DbSet<Advertisement> Advertisements { get; }
    DbSet<ErpOrder> ErpOrders { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
