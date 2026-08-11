using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PayoutsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    // In-memory persistent data stores for driver bank accounts & payout requests
    private static readonly ConcurrentDictionary<Guid, DriverBankDetailsDto> _driverBankAccounts = new();
    private static readonly ConcurrentBag<PayoutRequestDto> _payoutRequests = new();

    public PayoutsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets driver earnings summary, available balance, and trip earnings breakdown.
    /// </summary>
    [HttpGet("driver/{driverId}/summary")]
    public async Task<IActionResult> GetDriverEarningsSummary(Guid driverId)
    {
        var driver = await _context.Drivers
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == driverId || d.UserId == driverId);

        if (driver == null)
            return NotFound(new { message = "Driver profile not found" });

        // Get driver's completed bookings
        var completedBookings = await _context.Bookings
            .Where(b => b.DriverId == driver.Id && (b.Status == Domain.Enums.BookingStatus.Delivered || b.Status == Domain.Enums.BookingStatus.Completed))
            .OrderByDescending(b => b.CompletedAt ?? b.CreatedAt)
            .ToListAsync();

        decimal totalEarnings = completedBookings.Sum(b => b.DriverPayout > 0 ? b.DriverPayout : b.TotalFare * 0.85m);
        decimal cashCollected = completedBookings
            .Where(b => b.PaymentMethod.ToString() == "Cash")
            .Sum(b => b.TotalFare);

        decimal onlineEarnings = completedBookings
            .Where(b => b.PaymentMethod.ToString() != "Cash")
            .Sum(b => b.DriverPayout > 0 ? b.DriverPayout : b.TotalFare * 0.85m);

        // Sum completed payouts
        decimal totalPayoutsProcessed = _payoutRequests
            .Where(p => p.DriverId == driver.Id && p.Status == "Transferred")
            .Sum(p => p.Amount);

        decimal pendingPayouts = _payoutRequests
            .Where(p => p.DriverId == driver.Id && p.Status == "Pending")
            .Sum(p => p.Amount);

        // Available balance for withdrawal
        decimal availableBalance = Math.Max(0, onlineEarnings - totalPayoutsProcessed - pendingPayouts);

        var tripBreakdown = completedBookings.Take(10).Select(b => new
        {
            bookingId = b.Id,
            date = (b.CompletedAt ?? b.CreatedAt).ToString("yyyy-MM-dd HH:mm"),
            pickup = b.PickupAddress,
            paymentMethod = b.PaymentMethod.ToString(),
            totalFare = b.TotalFare,
            driverPayout = b.DriverPayout > 0 ? b.DriverPayout : b.TotalFare * 0.85m,
            platformCommission = b.Commission > 0 ? b.Commission : b.TotalFare * 0.15m
        });

        _driverBankAccounts.TryGetValue(driver.Id, out var bankDetails);

        return Ok(new
        {
            driverId = driver.Id,
            driverName = driver.User?.FullName ?? "Driver Partner",
            totalEarnings = totalEarnings,
            cashCollected = cashCollected,
            onlineEarnings = onlineEarnings,
            availableBalance = availableBalance,
            pendingPayouts = pendingPayouts,
            totalPayoutsProcessed = totalPayoutsProcessed,
            completedJobsCount = completedBookings.Count,
            bankDetailsConfigured = bankDetails != null,
            bankDetails = bankDetails,
            recentTrips = tripBreakdown
        });
    }

    /// <summary>
    /// Gets saved bank account details for a driver.
    /// </summary>
    [HttpGet("driver/{driverId}/bank-account")]
    public IActionResult GetDriverBankAccount(Guid driverId)
    {
        if (_driverBankAccounts.TryGetValue(driverId, out var bankDetails))
        {
            return Ok(bankDetails);
        }

        return Ok(new
        {
            configured = false,
            message = "No bank account details saved yet."
        });
    }

    /// <summary>
    /// Saves or updates bank account details for direct bank transfer payout.
    /// </summary>
    [HttpPost("driver/{driverId}/bank-account")]
    public IActionResult SaveDriverBankAccount(Guid driverId, [FromBody] DriverBankDetailsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BankName) || string.IsNullOrWhiteSpace(dto.AccountNumber) || string.IsNullOrWhiteSpace(dto.AccountHolderName))
        {
            return BadRequest(new { message = "Bank name, account number, and account holder name are required." });
        }

        dto.DriverId = driverId;
        dto.UpdatedAt = DateTime.UtcNow;
        dto.IsVerified = true;

        _driverBankAccounts[driverId] = dto;

        return Ok(new
        {
            message = "Bank account details saved successfully! Direct payouts will be transferred to this account.",
            bankDetails = dto
        });
    }

    /// <summary>
    /// Submits a cash-out withdrawal payout request.
    /// </summary>
    [HttpPost("request")]
    public async Task<IActionResult> RequestPayout([FromBody] CreatePayoutRequestDto dto)
    {
        if (dto.DriverId == Guid.Empty || dto.Amount < 1000)
        {
            return BadRequest(new { message = "Minimum cash-out withdrawal amount is LKR 1,000." });
        }

        if (!_driverBankAccounts.TryGetValue(dto.DriverId, out var bankDetails))
        {
            return BadRequest(new { message = "Please configure your bank account details before requesting a cash-out." });
        }

        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
        if (driver == null) return NotFound(new { message = "Driver profile not found." });

        var payoutRequest = new PayoutRequestDto
        {
            Id = Guid.NewGuid(),
            DriverId = driver.Id,
            DriverName = driver.User?.FullName ?? "Driver Partner",
            Amount = dto.Amount,
            BankName = bankDetails.BankName,
            BranchName = bankDetails.BranchName,
            AccountNumber = bankDetails.AccountNumber,
            AccountHolderName = bankDetails.AccountHolderName,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow,
            ReferenceNumber = $"PO-{new Random().Next(100000, 999999)}"
        };

        _payoutRequests.Add(payoutRequest);

        return Ok(new
        {
            message = $"Cash-out request for LKR {dto.Amount:N0} submitted successfully! Transfers are processed within 24 hours to {bankDetails.BankName}.",
            payout = payoutRequest
        });
    }

    /// <summary>
    /// Gets payout history for a specific driver.
    /// </summary>
    [HttpGet("history/{driverId}")]
    public IActionResult GetPayoutHistory(Guid driverId)
    {
        var list = _payoutRequests
            .Where(p => p.DriverId == driverId)
            .OrderByDescending(p => p.RequestedAt)
            .ToList();

        return Ok(list);
    }

    /// <summary>
    /// Admin endpoint: Returns all pending payout requests.
    /// </summary>
    [HttpGet("admin/pending")]
    public IActionResult GetPendingPayouts()
    {
        var list = _payoutRequests
            .Where(p => p.Status == "Pending")
            .OrderByDescending(p => p.RequestedAt)
            .ToList();

        return Ok(list);
    }

    /// <summary>
    /// Admin endpoint: Approves and processes a bank payout transfer.
    /// </summary>
    [HttpPost("admin/{payoutId}/approve")]
    public IActionResult ApprovePayout(Guid payoutId, [FromBody] ApprovePayoutDto dto)
    {
        var payout = _payoutRequests.FirstOrDefault(p => p.Id == payoutId);
        if (payout == null) return NotFound(new { message = "Payout request not found." });

        payout.Status = "Transferred";
        payout.ProcessedAt = DateTime.UtcNow;
        payout.BankReferenceNumber = dto.BankReferenceNumber ?? $"BANK-REF-{new Random().Next(100000, 999999)}";

        return Ok(new
        {
            message = $"Payout of LKR {payout.Amount:N0} approved and marked as Transferred.",
            payout = payout
        });
    }
}

public class DriverBankDetailsDto
{
    public Guid DriverId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public bool IsVerified { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CreatePayoutRequestDto
{
    public Guid DriverId { get; set; }
    public decimal Amount { get; set; }
}

public class ApprovePayoutDto
{
    public string? BankReferenceNumber { get; set; }
}

public class PayoutRequestDto
{
    public Guid Id { get; set; }
    public Guid DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Transferred, Rejected
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string? BankReferenceNumber { get; set; }
}
