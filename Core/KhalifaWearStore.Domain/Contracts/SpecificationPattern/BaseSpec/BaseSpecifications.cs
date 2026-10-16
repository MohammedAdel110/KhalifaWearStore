using System.Linq.Expressions;

namespace KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec
{
    public abstract class BaseSpecifications<TEntity, TKey>
        : ISpecifications<TEntity, TKey> where TEntity : class, IEntity<TKey>
    {
        protected BaseSpecifications()
        {
            Criteria = x => true;
        }

        public Expression<Func<TEntity, bool>> Criteria { get; private set; }

        protected BaseSpecifications(Expression<Func<TEntity, bool>> criteria)
            => Criteria = criteria;

        public List<Expression<Func<TEntity, object>>> Includes { get; private set; } = new();
        protected void AddInclude(Expression<Func<TEntity, object>> includeExpression)
            => Includes.Add(includeExpression);

        public List<string> IncludeStrings { get; private set; } = new();
        protected void AddInclude(string includeString)
            => IncludeStrings.Add(includeString);

        public List<OrderExpressionInfo<TEntity>> OrderByExpressions { get; private set; } = new();
        protected void AddOrderBy(Expression<Func<TEntity, object>> orderByExpression, bool isDescending = false)
            => OrderByExpressions.Add(new OrderExpressionInfo<TEntity>
            {
                OrderByExpression = orderByExpression,
                IsDescending = isDescending
            });

        public int Take { get; private set; }
        public int Skip { get; private set; }
        public bool IsPagingEnabled { get; private set; }

        protected void ApplyPaging(int pageSize, int pageIndex)
        {
            Skip = (pageIndex - 1) * pageSize;
            Take = pageSize;
            IsPagingEnabled = true;
        }
    }
}
