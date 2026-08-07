// TruckMe.Infrastructure/Persistence/Repositories/GenericRepository.cs
using Microsoft.EntityFrameworkCore;
using TruckMe.Domain.Common;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;

namespace TruckMe.Infrastructure.Persistence.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    protected readonly TruckMeDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(TruckMeDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    /// <summary>
    /// Retrieves a single entity by its primary key.
    /// Checks the change-tracker cache before hitting the database.
    /// </summary>
    public async Task<T?> GetByIdAsync(Guid id)
        => await _dbSet.FindAsync(id);

    /// <summary>
    /// Returns all entities as a no-tracking, read-only list.
    /// </summary>
    public async Task<IEnumerable<T>> GetAllAsync()
        => await _dbSet.AsNoTracking().ToListAsync();

    /// <summary>
    /// Stages a new entity for insertion. The caller must invoke
    /// SaveChangesAsync (via IApplicationDbContext) to persist.
    /// </summary>
    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        return entity;
    }

    /// <summary>
    /// Marks the entity as modified. EF Core will generate an UPDATE
    /// statement on the next SaveChangesAsync call.
    /// </summary>
    public Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Marks the entity for deletion. The caller must invoke
    /// SaveChangesAsync to commit the removal.
    /// </summary>
    public Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }
}
