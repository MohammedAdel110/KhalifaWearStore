using System.Linq.Expressions;

namespace KhalifaWearStore.Domain.Contracts.SpecificationPattern
{
    public interface ISpecifications<TEntity, TKey> where TEntity : IEntity<TKey>
    {
        Expression<Func<TEntity, bool>> Criteria { get; }
        List<Expression<Func<TEntity, object>>> Includes { get; }
        List<OrderExpressionInfo<TEntity>> OrderByExpressions { get; }
        List<string> IncludeStrings { get; }
        int Take { get; }
        int Skip { get; }
        bool IsPagingEnabled { get; }
    }
}
