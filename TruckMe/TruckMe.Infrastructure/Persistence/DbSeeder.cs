using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(TruckMeDbContext context)
    {
        var demoUserId = Guid.Parse("f4c15eb0-7fb3-4a89-915f-5113a1d20f22");

        if (!await context.Users.AnyAsync(u => u.Id == demoUserId || u.Email == "cus001@gmail.com"))
        {
            var customer = new User
            {
                Id = demoUserId,
                FullName = "Kamal Perera",
                Email = "cus001@gmail.com",
                PasswordHash = "123456",
                PhoneNumber = "+94771234567",
                Role = UserRole.Customer,
                WalletBalance = 50000m,
                IsActive = true,
                CompanyName = "Lanka FMCG Distributors",
                BusinessType = "FMCG Distribution",
                IsPremiumMember = true
            };

            await context.Users.AddAsync(customer);

            // Add default customer addresses
            var address1 = new Address
            {
                Id = Guid.NewGuid(),
                UserId = demoUserId,
                Label = "Home",
                AddressLine1 = "42 Galle Road, Bambalapitiya",
                City = "Colombo 04",
                District = "Colombo",
                Province = "Western",
                Latitude = 6.8920m,
                Longitude = 79.8550m,
                IsDefault = true
            };

            var address2 = new Address
            {
                Id = Guid.NewGuid(),
                UserId = demoUserId,
                Label = "Warehouse",
                AddressLine1 = "100 Kaduwela Road, Malabe",
                City = "Malabe",
                District = "Colombo",
                Province = "Western",
                Latitude = 6.9040m,
                Longitude = 79.9600m,
                IsDefault = false
            };

            await context.Addresses.AddRangeAsync(address1, address2);

            // Add sample booking
            var sampleBooking = new Booking
            {
                Id = Guid.NewGuid(),
                CustomerId = demoUserId,
                PickupAddress = "42 Galle Road, Bambalapitiya",
                PickupLatitude = 6.8920m,
                PickupLongitude = 79.8550m,
                PickupContactName = "Kamal Perera",
                PickupContactPhone = "+94771234567",
                CargoType = CargoType.Dry,
                CargoDescription = "FMCG Cartons & Boxes",
                CargoWeightKg = 750,
                RequiredVehicleSize = VehicleSize.OneTon,
                NeedsHelpers = true,
                HelperCount = 1,
                BaseFare = 4000m,
                DistanceFare = 2400m,
                AddOnFare = 1500m,
                TotalFare = 7900m,
                Commission = 790m,
                DriverPayout = 7110m,
                TotalDistanceKm = 15m,
                EstimatedDurationMinutes = 40,
                ScheduledAt = DateTime.UtcNow.AddHours(2),
                Status = BookingStatus.Assigned
            };

            sampleBooking.DeliveryStops.Add(new DeliveryStop
            {
                Id = Guid.NewGuid(),
                BookingId = sampleBooking.Id,
                Sequence = 1,
                Address = "50 Main Street, Kandy",
                Latitude = 7.2906m,
                Longitude = 80.6337m,
                RecipientName = "Saman Retail Store",
                RecipientPhone = "+94719876543",
                Status = DeliveryStopStatus.Pending
            });

            await context.Bookings.AddAsync(sampleBooking);
            await context.SaveChangesAsync();
        }
    }
}
