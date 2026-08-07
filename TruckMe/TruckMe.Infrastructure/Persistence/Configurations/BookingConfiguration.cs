// TruckMe.Infrastructure/Persistence/Configurations/BookingConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("Bookings");

        builder.HasKey(b => b.Id);

        // ── Foreign keys ────────────────────────────────────────────────
        builder.Property(b => b.CustomerId)
            .IsRequired();

        builder.Property(b => b.DriverId)
            .IsRequired(false);

        // ── Pickup ──────────────────────────────────────────────────────
        builder.Property(b => b.PickupAddress)
            .IsRequired()
            .HasColumnType("nvarchar(500)")
            .HasMaxLength(500);

        builder.Property(b => b.PickupLatitude)
            .IsRequired()
            .HasColumnType("decimal(10,7)");

        builder.Property(b => b.PickupLongitude)
            .IsRequired()
            .HasColumnType("decimal(10,7)");

        builder.Property(b => b.PickupContactName)
            .IsRequired()
            .HasColumnType("nvarchar(100)")
            .HasMaxLength(100);

        builder.Property(b => b.PickupContactPhone)
            .IsRequired()
            .HasColumnType("nvarchar(20)")
            .HasMaxLength(20);

        // ── Cargo ───────────────────────────────────────────────────────
        builder.Property(b => b.CargoType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(b => b.CargoDescription)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(b => b.CargoWeightKg)
            .HasColumnType("decimal(8,2)")
            .IsRequired(false);

        builder.Property(b => b.RequiredVehicleSize)
            .IsRequired()
            .HasConversion<int>();

        // ── Add-ons ─────────────────────────────────────────────────────
        builder.Property(b => b.NeedsHelpers)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.Property(b => b.HelperCount)
            .HasColumnType("int")
            .HasDefaultValue(0);

        builder.Property(b => b.NeedsLoading)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.Property(b => b.NeedsUnloading)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.Property(b => b.IsExpress)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.Property(b => b.IsFullDay)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        // ── Fare breakdown ──────────────────────────────────────────────
        builder.Property(b => b.BaseFare)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.DistanceFare)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.StopFare)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.AddOnFare)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.SurgeMultiplier)
            .HasColumnType("decimal(5,2)")
            .HasDefaultValue(1.00m);

        builder.Property(b => b.TotalFare)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.CommissionRate)
            .HasColumnType("decimal(5,4)")
            .HasDefaultValue(0.1500m);

        builder.Property(b => b.Commission)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(b => b.DriverPayout)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        // ── Distance & duration (double → SQL float) ─────────────────
        // EF Core maps C# double to SQL Server float natively; no explicit
        // column type override needed. Marking the column type explicitly
        // for clarity and schema consistency.
        builder.Property(b => b.TotalDistanceKm)
            .IsRequired()
            .HasColumnType("float");

        builder.Property(b => b.EstimatedDurationMinutes)
            .IsRequired()
            .HasColumnType("int");

        // ── Scheduling & payment ────────────────────────────────────────
        builder.Property(b => b.ScheduledAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(b => b.PaymentMethod)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(b => b.StartedAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(b => b.CompletedAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        // ── Status ──────────────────────────────────────────────────────
        builder.Property(b => b.Status)
            .IsRequired()
            .HasConversion<int>()
            .HasDefaultValue(BookingStatus.Pending);

        builder.Property(b => b.CancellationReason)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        // ── Audit columns ────────────────────────────────────────────────
        builder.Property(b => b.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(b => b.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        // ── Relationships ────────────────────────────────────────────────
        builder.HasOne(b => b.Customer)
            .WithMany(u => u.Bookings)
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Driver)
            .WithMany(d => d.AssignedBookings)
            .HasForeignKey(b => b.DriverId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(b => b.DeliveryStops)
            .WithOne(ds => ds.Booking)
            .HasForeignKey(ds => ds.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(b => b.Payment)
            .WithOne(p => p.Booking)
            .HasForeignKey<Payment>(p => p.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(b => b.Review)
            .WithOne(r => r.Booking)
            .HasForeignKey<Review>(r => r.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Indexes ──────────────────────────────────────────────────────
        builder.HasIndex(b => b.CustomerId)
            .HasDatabaseName("IX_Bookings_CustomerId");

        builder.HasIndex(b => b.DriverId)
            .HasDatabaseName("IX_Bookings_DriverId");

        builder.HasIndex(b => b.Status)
            .HasDatabaseName("IX_Bookings_Status");
    }
}
