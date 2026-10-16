using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using CategoryEntity = KhalifaWearStore.Domain.Models.Catalog.Category;

namespace KhalifaWearStore.Services.Specifications.CategorySpec
{
    public class CategoryByIdWithProductsSpec : BaseSpecifications<CategoryEntity, int>
    {
        public CategoryByIdWithProductsSpec(int categoryId)
            : base(c => c.Id == categoryId && !c.IsDeleted)
        {
            AddInclude(c => c.Products);
        }
    }
}
