// TruckMe.Infrastructure/Persistence/Configurations/PaymentConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.BookingId)
            .IsRequired();

        builder.Property(p => p.Amount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(p => p.Method)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(p => p.Status)
            .IsRequired()
            .HasConversion<int>()
            .HasDefaultValue(PaymentStatus.Pending);

        builder.Property(p => p.TransactionId)
            .HasColumnType("nvarchar(200)")
            .IsRequired(false);

        builder.Property(p => p.CommissionAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(p => p.DriverPayoutAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(p => p.PaidAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(p => p.PayoutAt)
            .HasColumnType("datetime2")
            .IsRequired(false);

        builder.Property(p => p.InvoiceUrl)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(p => p.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(p => p.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        // One-to-one with Booking — FK lives on Payment
        builder.HasOne(p => p.Booking)
            .WithOne(b => b.Payment)
            .HasForeignKey<Payment>(p => p.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
