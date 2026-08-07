// TruckMe.Infrastructure/Persistence/Configurations/DriverConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class DriverConfiguration : IEntityTypeConfiguration<Driver>
{
    public void Configure(EntityTypeBuilder<Driver> builder)
    {
        builder.ToTable("Drivers");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.UserId)
            .IsRequired();

        builder.HasIndex(d => d.UserId)
            .IsUnique();

        builder.Property(d => d.LicenseNumber)
            .IsRequired()
            .HasColumnType("nvarchar(50)")
            .HasMaxLength(50);

        builder.Property(d => d.LicenseImageUrl)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(d => d.VehiclePlateNumber)
            .IsRequired()
            .HasColumnType("nvarchar(20)")
            .HasMaxLength(20);

        builder.Property(d => d.VehicleType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(d => d.IsOnline)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.Property(d => d.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(d => d.RatingAverage)
            .HasColumnType("decimal(3,2)")
            .HasDefaultValue(0m);

        builder.Property(d => d.TotalRatings)
            .HasColumnType("int")
            .HasDefaultValue(0);

        builder.Property(d => d.TotalCompletedJobs)
            .HasColumnType("int")
            .HasDefaultValue(0);

        builder.Property(d => d.TotalEarnings)
            .HasColumnType("decimal(18,2)")
            .HasDefaultValue(0m);

        builder.Property(d => d.CurrentLatitude)
            .HasColumnType("decimal(10,7)")
            .HasDefaultValue(0m);

        builder.Property(d => d.CurrentLongitude)
            .HasColumnType("decimal(10,7)")
            .HasDefaultValue(0m);

        builder.Property(d => d.LastLocationUpdate)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(d => d.FcmToken)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(d => d.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(d => d.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.HasOne(d => d.User)
            .WithOne()
            .HasForeignKey<Driver>(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(d => d.AssignedBookings)
            .WithOne(b => b.Driver)
            .HasForeignKey(b => b.DriverId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
