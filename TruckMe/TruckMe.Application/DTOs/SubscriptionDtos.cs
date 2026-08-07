namespace TruckMe.Application.DTOs;

public record SubscriptionPlanDto(
    Guid Id,
    string Name,
    string Description,
    decimal MonthlyFeeLkr,
    decimal DiscountPercentage,
    bool HasPriorityBooking,
    bool HasDedicatedAccountManager,
    bool HasAdvancedReporting
);

public record SubscribeUserRequest(
    Guid UserId,
    Guid SubscriptionPlanId
);

public record UserSubscriptionResponse(
    Guid Id,
    Guid UserId,
    string PlanName,
    DateTime StartDate,
    DateTime EndDate,
    bool IsActive,
    decimal MonthlyFeePaid,
    decimal DiscountPercentage
);
