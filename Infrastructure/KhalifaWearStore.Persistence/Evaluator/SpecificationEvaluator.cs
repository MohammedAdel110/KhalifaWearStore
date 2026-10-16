using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern;

namespace KhalifaWearStore.Persistence.Evaluator
{
    public static class SpecificationEvaluator
    {
        public static IQueryable<TEntity> GenerateQuery<TEntity, TKey>(
            IQueryable<TEntity> baseQuery,
            ISpecifications<TEntity, TKey> specifications)
            where TEntity : class, IEntity<TKey>
        {
            var query = baseQuery;

            if (specifications.Criteria != null)
                query = query.Where(specifications.Criteria);

            if (specifications.Includes is not null && specifications.Includes.Any())
            {
                foreach (var includeExpression in specifications.Includes)
                {
                    query = query.Include(includeExpression);
                }
            }

            if (specifications.IncludeStrings is not null && specifications.IncludeStrings.Any())
            {
                foreach (var includeString in specifications.IncludeStrings)
                {
                    query = query.Include(includeString);
                }
            }

            if (specifications.OrderByExpressions is not null && specifications.OrderByExpressions.Any())
            {
                var firstOrderBy = specifications.OrderByExpressions.First();
                IOrderedQueryable<TEntity> orderQuery = firstOrderBy.IsDescending
                    ? query.OrderByDescending(firstOrderBy.OrderByExpression!)
                    : query.OrderBy(firstOrderBy.OrderByExpression!);

                for (int i = 1; i < specifications.OrderByExpressions.Count; i++)
                {
                    var nextOrderBy = specifications.OrderByExpressions[i];
                    orderQuery = nextOrderBy.IsDescending
                        ? orderQuery.ThenByDescending(nextOrderBy.OrderByExpression!)
                        : orderQuery.ThenBy(nextOrderBy.OrderByExpression!);
                }

                query = orderQuery;
            }

            if (specifications.IsPagingEnabled)
                query = query.Skip(specifications.Skip).Take(specifications.Take);

            return query;
        }
    }
}
