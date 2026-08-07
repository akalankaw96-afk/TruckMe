// TruckMe.Infrastructure/Persistence/TruckMeDbContext.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Common;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence;

public class TruckMeDbContext : DbContext, IApplicationDbContext
{
    public TruckMeDbContext(DbContextOptions<TruckMeDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<DeliveryStop> DeliveryStops => Set<DeliveryStop>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<ReturnLoad> ReturnLoads => Set<ReturnLoad>();
    public DbSet<Advertisement> Advertisements => Set<Advertisement>();
    public DbSet<ErpOrder> ErpOrders => Set<ErpOrder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TruckMeDbContext).Assembly);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    if (entry.Entity.CreatedAt == default)
                        entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
