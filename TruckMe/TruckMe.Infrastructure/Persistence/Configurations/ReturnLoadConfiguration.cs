using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class ReturnLoadConfiguration : IEntityTypeConfiguration<ReturnLoad>
{
    public void Configure(EntityTypeBuilder<ReturnLoad> builder)
    {
        builder.HasKey(rl => rl.Id);

        builder.Property(rl => rl.OriginCity)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(rl => rl.DestinationCity)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(rl => rl.OriginLatitude)
            .HasPrecision(10, 7);

        builder.Property(rl => rl.OriginLongitude)
            .HasPrecision(10, 7);

        builder.Property(rl => rl.DestinationLatitude)
            .HasPrecision(10, 7);

        builder.Property(rl => rl.DestinationLongitude)
            .HasPrecision(10, 7);

        builder.Property(rl => rl.DiscountPercentage)
            .HasPrecision(5, 2);

        builder.HasOne(rl => rl.Driver)
            .WithMany()
            .HasForeignKey(rl => rl.DriverId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
