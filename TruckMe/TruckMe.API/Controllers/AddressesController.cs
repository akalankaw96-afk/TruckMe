using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Entities;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AddressesController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AddressesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<object>>> GetAddresses([FromQuery] Guid userId)
    {
        var addresses = await _context.Addresses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ToListAsync();

        return Ok(addresses.Select(a => new
        {
            id = a.Id,
            label = a.Label,
            addressLine1 = a.AddressLine1,
            city = a.City,
            district = a.District,
            province = a.Province,
            postalCode = a.PostalCode,
            latitude = a.Latitude,
            longitude = a.Longitude,
            contactName = a.ContactName,
            contactPhone = a.ContactPhone,
            isDefault = a.IsDefault
        }));
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateAddress([FromBody] CreateAddressDto dto)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
        {
            var user = new User
            {
                Id = dto.UserId,
                FullName = "Customer User",
                Email = $"user_{dto.UserId.ToString()[..6]}@truckme.lk",
                PasswordHash = "123456",
                PhoneNumber = "+94770000000",
                Role = Domain.Enums.UserRole.Customer,
                IsActive = true
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        if (dto.IsDefault)
        {
            var existingDefaults = await _context.Addresses
                .Where(a => a.UserId == dto.UserId && a.IsDefault)
                .ToListAsync();
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
            }
        }

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Label = dto.Label ?? "Home",
            AddressLine1 = dto.AddressLine1,
            City = dto.City ?? "Colombo",
            District = dto.District ?? "Colombo",
            Province = dto.Province ?? dto.District ?? "Western",
            Latitude = dto.Latitude != 0 ? dto.Latitude : 6.9271m,
            Longitude = dto.Longitude != 0 ? dto.Longitude : 79.8612m,
            IsDefault = dto.IsDefault
        };

        await _context.Addresses.AddAsync(address);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = address.Id,
            label = address.Label,
            addressLine1 = address.AddressLine1,
            city = address.City,
            district = address.District,
            province = address.Province,
            latitude = address.Latitude,
            longitude = address.Longitude,
            isDefault = address.IsDefault
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAddress(Guid id, [FromQuery] Guid? userId)
    {
        var address = userId.HasValue && userId.Value != Guid.Empty
            ? await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value)
            : await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id);

        if (address == null) return NotFound(new { message = "Address not found" });

        _context.Addresses.Remove(address);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Address deleted successfully" });
    }
}

public record CreateAddressDto(
    Guid UserId,
    string Label,
    string AddressLine1,
    string City,
    string District,
    string? Province,
    decimal Latitude,
    decimal Longitude,
    bool IsDefault
);
