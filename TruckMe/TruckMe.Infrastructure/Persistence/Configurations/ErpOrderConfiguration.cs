using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class ErpOrderConfiguration : IEntityTypeConfiguration<ErpOrder>
{
    public void Configure(EntityTypeBuilder<ErpOrder> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExternalSystemName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.ExternalOrderId)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasOne(e => e.Customer)
            .WithMany()
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Booking)
            .WithMany()
            .HasForeignKey(e => e.BookingId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
