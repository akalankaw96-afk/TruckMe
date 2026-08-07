// TruckMe.Infrastructure/Persistence/Configurations/DeliveryStopConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class DeliveryStopConfiguration : IEntityTypeConfiguration<DeliveryStop>
{
    public void Configure(EntityTypeBuilder<DeliveryStop> builder)
    {
        builder.ToTable("DeliveryStops");

        builder.HasKey(ds => ds.Id);

        builder.Property(ds => ds.BookingId)
            .IsRequired();

        builder.Property(ds => ds.Sequence)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(ds => ds.Address)
            .IsRequired()
            .HasColumnType("nvarchar(500)")
            .HasMaxLength(500);

        builder.Property(ds => ds.Latitude)
            .IsRequired()
            .HasColumnType("decimal(10,7)");

        builder.Property(ds => ds.Longitude)
            .IsRequired()
            .HasColumnType("decimal(10,7)");

        builder.Property(ds => ds.RecipientName)
            .IsRequired()
            .HasColumnType("nvarchar(100)")
            .HasMaxLength(100);

        builder.Property(ds => ds.RecipientPhone)
            .IsRequired()
            .HasColumnType("nvarchar(20)")
            .HasMaxLength(20);

        builder.Property(ds => ds.Notes)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(ds => ds.Status)
            .IsRequired()
            .HasConversion<int>()
            .HasDefaultValue(DeliveryStopStatus.Pending);

        builder.Property(ds => ds.ArrivedAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(ds => ds.CompletedAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(ds => ds.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(ds => ds.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        // Relationship — mirrors the inverse configured in BookingConfiguration
        builder.HasOne(ds => ds.Booking)
            .WithMany(b => b.DeliveryStops)
            .HasForeignKey(ds => ds.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique composite index: each stop sequence must be unique per booking
        builder.HasIndex(ds => new { ds.BookingId, ds.Sequence })
            .IsUnique()
            .HasDatabaseName("IX_DeliveryStops_BookingId_Sequence");
    }
}
