using System.Linq.Expressions;

namespace KhalifaWearStore.Domain.Contracts.SpecificationPattern
{
    public class OrderExpressionInfo<TEntity>
    {
        public Expression<Func<TEntity, object>>? OrderByExpression { get; set; }
        public bool IsDescending { get; set; }
    }
}
