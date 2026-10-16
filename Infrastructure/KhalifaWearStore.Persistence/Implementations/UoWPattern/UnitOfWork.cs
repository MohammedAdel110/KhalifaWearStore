using KhalifaWearStore.Domain.Contracts;
using KhalifaWearStore.Domain.Contracts.GenericReposPattern;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Persistence.Implementations.ReposPattern;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;

namespace KhalifaWearStore.Persistence.Implementations.UoWPattern
{
    public class UnitOfWork(KhalifaDbContext context) : IUnitOfWork
    {
        private readonly Dictionary<string, object> _repositories = [];

        public IGenericRepo<TEntity, TKey> GetRepository<TEntity, TKey>() where TEntity : class, IEntity<TKey>
        {
            var typeName = typeof(TEntity).Name;

            if (_repositories.TryGetValue(typeName, out var existingRepo))
                return (IGenericRepo<TEntity, TKey>)existingRepo;

            var repository = new GenericRepo<TEntity, TKey>(context);
            _repositories[typeName] = repository;

            return repository;
        }

        public async Task<int> SaveChangesAsync() => await context.SaveChangesAsync();

        public async ValueTask DisposeAsync() => await context.DisposeAsync();
    }
}
