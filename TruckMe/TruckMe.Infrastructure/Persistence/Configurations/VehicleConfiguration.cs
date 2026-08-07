// TruckMe.Infrastructure/Persistence/Configurations/VehicleConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.ToTable("Vehicles");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.DriverId)
            .IsRequired();

        builder.Property(v => v.PlateNumber)
            .IsRequired()
            .HasColumnType("nvarchar(20)")
            .HasMaxLength(20);

        builder.Property(v => v.Size)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(v => v.Model)
            .IsRequired()
            .HasColumnType("nvarchar(100)")
            .HasMaxLength(100);

        builder.Property(v => v.CapacityKg)
            .IsRequired()
            .HasColumnType("int");

        builder.Property(v => v.LengthMeters)
            .HasColumnType("decimal(6,2)")
            .IsRequired(false);

        builder.Property(v => v.WidthMeters)
            .HasColumnType("decimal(6,2)")
            .IsRequired(false);

        builder.Property(v => v.HeightMeters)
            .HasColumnType("decimal(6,2)")
            .IsRequired(false);

        builder.Property(v => v.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(v => v.ImageUrl)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(v => v.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(v => v.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.HasOne(v => v.Driver)
            .WithMany()
            .HasForeignKey(v => v.DriverId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
