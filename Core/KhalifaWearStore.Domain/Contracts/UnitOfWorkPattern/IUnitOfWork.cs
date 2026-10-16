using KhalifaWearStore.Domain.Contracts.GenericReposPattern;

namespace KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern
{
    public interface IUnitOfWork : IAsyncDisposable
    {
        IGenericRepo<TEntity, TKey> GetRepository<TEntity, TKey>() where TEntity : class, IEntity<TKey>;
        Task<int> SaveChangesAsync();
    }
}
