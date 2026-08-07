// TruckMe.Infrastructure/Persistence/Configurations/ReviewConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Reviews");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.BookingId)
            .IsRequired();

        builder.Property(r => r.CustomerId)
            .IsRequired();

        builder.Property(r => r.DriverId)
            .IsRequired();

        builder.Property(r => r.Rating)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(r => r.Comment)
            .HasColumnType("nvarchar(1000)")
            .HasMaxLength(1000)
            .IsRequired(false);

        builder.Property(r => r.PunctualityRating)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(r => r.ProfessionalismRating)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(r => r.VehicleConditionRating)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(r => r.ServiceRating)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(r => r.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(r => r.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        // One-to-one with Booking — FK lives on Review
        builder.HasOne(r => r.Booking)
            .WithOne(b => b.Review)
            .HasForeignKey<Review>(r => r.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
