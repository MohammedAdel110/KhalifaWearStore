using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts;
using KhalifaWearStore.Domain.Contracts.GenericReposPattern;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern;
using KhalifaWearStore.Persistence.Evaluator;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;

namespace KhalifaWearStore.Persistence.Implementations.ReposPattern
{
    public class GenericRepo<TEntity, TKey>(KhalifaDbContext dbContext)
        : IGenericRepo<TEntity, TKey> where TEntity : class, IEntity<TKey>
    {
        private readonly DbSet<TEntity> _dbSet = dbContext.Set<TEntity>();

        public async Task<IReadOnlyList<TEntity>> GetAllAsync()
            => await _dbSet.AsNoTracking().ToListAsync();

        public async Task<IReadOnlyList<TEntity>> GetAllWithSpecAsync(ISpecifications<TEntity, TKey> specifications)
        {
            var baseQuery = _dbSet.AsNoTracking();
            var query = SpecificationEvaluator.GenerateQuery(baseQuery, specifications);
            return await query.ToListAsync();
        }

        public async Task<TEntity?> GetByIdAsync(TKey id)
            => await _dbSet.FindAsync(id);

        public async Task<TEntity?> GetByIdWithSpecAsync(ISpecifications<TEntity, TKey> specifications)
        {
            var baseQuery = _dbSet.AsQueryable();
            var query = SpecificationEvaluator.GenerateQuery(baseQuery, specifications);
            return await query.FirstOrDefaultAsync();
        }

        public async Task AddAsync(TEntity entity)
            => await _dbSet.AddAsync(entity);

        public void UpdateAsync(TEntity entity)
            => _dbSet.Update(entity);

        public void DeleteAsync(TEntity entity)
            => _dbSet.Remove(entity);

        public async Task<int> GetCountAsync(ISpecifications<TEntity, TKey> specifications)
        {
            var baseQuery = _dbSet.AsNoTracking();
            var query = SpecificationEvaluator.GenerateQuery(baseQuery, specifications);
            return await query.CountAsync();
        }
    }
}
