using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using StockEntity = KhalifaWearStore.Domain.Models.Catalog.Stock;

namespace KhalifaWearStore.Services.Specifications.StockSpec
{
    public class StockByIdWithProductSpec : BaseSpecifications<StockEntity, int>
    {
        public StockByIdWithProductSpec(int stockId)
            : base(s => s.Id == stockId && !s.IsDeleted)
        {
            AddInclude(s => s.Product);
        }
    }

    public class StocksByProductIdSpec : BaseSpecifications<StockEntity, int>
    {
        public StocksByProductIdSpec(int productId)
            : base(s => s.ProductId == productId && !s.IsDeleted)
        {
            AddInclude(s => s.Product);
            AddOrderBy(s => s.Size, isDescending: false);
        }
    }

    public class StockByProductVariantSpec : BaseSpecifications<StockEntity, int>
    {
        public StockByProductVariantSpec(int productId, string size, string colour)
            : base(s =>
                s.ProductId == productId &&
                !s.IsDeleted &&
                s.Size.ToLower() == size.ToLower() &&
                s.Colour.ToLower() == colour.ToLower())
        {
        }
    }
}
