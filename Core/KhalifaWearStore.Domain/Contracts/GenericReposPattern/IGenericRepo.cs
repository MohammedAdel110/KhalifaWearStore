using KhalifaWearStore.Domain.Contracts.SpecificationPattern;

namespace KhalifaWearStore.Domain.Contracts.GenericReposPattern
{
    public interface IGenericRepo<TEntity, TKey> where TEntity : IEntity<TKey>
    {
        Task<IReadOnlyList<TEntity>> GetAllAsync();
        Task<IReadOnlyList<TEntity>> GetAllWithSpecAsync(ISpecifications<TEntity, TKey> specifications);
        Task<TEntity?> GetByIdAsync(TKey id);
        Task<TEntity?> GetByIdWithSpecAsync(ISpecifications<TEntity, TKey> specifications);
        Task AddAsync(TEntity entity);
        void UpdateAsync(TEntity entity);
        void DeleteAsync(TEntity entity);
        Task<int> GetCountAsync(ISpecifications<TEntity, TKey> specifications);
    }
}
