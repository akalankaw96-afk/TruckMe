using TruckMe.Domain.Common;
using TruckMe.Domain.Enums;

namespace TruckMe.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public decimal WalletBalance { get; set; } = 0m;
    public string ProfileImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? FcmToken { get; set; }

    // Business customer fields
    public string? CompanyName { get; set; }
    public string? BusinessType { get; set; } // FMCG, Manufacturing, Supermarket, E-commerce, etc.
    public string? TaxId { get; set; }
    public bool IsPremiumMember { get; set; } = false;

    // Navigation properties
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public UserSubscription? ActiveSubscription { get; set; }
}
