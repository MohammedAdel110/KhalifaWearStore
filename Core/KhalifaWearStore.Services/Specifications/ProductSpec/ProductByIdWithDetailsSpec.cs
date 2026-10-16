using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using ProductEntity = KhalifaWearStore.Domain.Models.Catalog.Product;

namespace KhalifaWearStore.Services.Specifications.ProductSpec
{
    public class ProductByIdWithDetailsSpec : BaseSpecifications<ProductEntity, int>
    {
        public ProductByIdWithDetailsSpec(int productId)
            : base(p => p.Id == productId && !p.IsDeleted)
        {
            AddInclude(p => p.Category);
            AddInclude(p => p.Stocks);
        }
    }
}
