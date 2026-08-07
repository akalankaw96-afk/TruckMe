using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Persistence.Configurations;

public class UserSubscriptionConfiguration : IEntityTypeConfiguration<UserSubscription>
{
    public void Configure(EntityTypeBuilder<UserSubscription> builder)
    {
        builder.HasKey(us => us.Id);

        builder.Property(us => us.MonthlyFeePaid)
            .HasPrecision(18, 2);

        builder.HasOne(us => us.User)
            .WithOne(u => u.ActiveSubscription)
            .HasForeignKey<UserSubscription>(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(us => us.SubscriptionPlan)
            .WithMany()
            .HasForeignKey(us => us.SubscriptionPlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
