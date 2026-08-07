// TruckMe.Infrastructure/Persistence/Configurations/UserConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasColumnType("nvarchar(100)")
            .HasMaxLength(100);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasColumnType("nvarchar(256)")
            .HasMaxLength(256);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasColumnType("nvarchar(500)");

        builder.Property(u => u.PhoneNumber)
            .IsRequired()
            .HasColumnType("nvarchar(20)")
            .HasMaxLength(20);

        builder.Property(u => u.Role)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(u => u.WalletBalance)
            .HasColumnType("decimal(18,2)")
            .HasDefaultValue(0m);

        builder.Property(u => u.ProfileImageUrl)
            .HasColumnType("nvarchar(500)")
            .IsRequired(false);

        builder.Property(u => u.CreatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.Property(u => u.UpdatedAt)
            .IsRequired()
            .HasColumnType("datetime2");

        builder.HasMany(u => u.Bookings)
            .WithOne(b => b.Customer)
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
