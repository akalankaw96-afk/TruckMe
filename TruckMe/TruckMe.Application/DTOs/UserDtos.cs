namespace TruckMe.Application.DTOs;

public record UserResponse(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string Role,
    decimal WalletBalance,
    string? ProfileImageUrl,
    string? CompanyName,
    string? BusinessType,
    string? TaxId,
    bool IsPremiumMember
);

public record UpdateProfileRequest(
    string FullName,
    string PhoneNumber,
    string? ProfileImageUrl,
    string? CompanyName,
    string? BusinessType,
    string? TaxId
);
