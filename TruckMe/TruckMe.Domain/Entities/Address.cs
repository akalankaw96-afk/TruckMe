using TruckMe.Domain.Common;

namespace TruckMe.Domain.Entities;

public class Address : BaseEntity
{
    public Guid UserId { get; set; }
    public string Label { get; set; } = "Home";
    public string AddressLine1 { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public bool IsDefault { get; set; } = false;

    // Navigation property
    public User User { get; set; } = null!;
}
