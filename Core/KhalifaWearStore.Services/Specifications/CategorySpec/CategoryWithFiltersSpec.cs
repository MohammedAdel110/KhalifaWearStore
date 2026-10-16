using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using KhalifaWearStore.Shared.Common.Params.Category;
using CategoryEntity = KhalifaWearStore.Domain.Models.Catalog.Category;

namespace KhalifaWearStore.Services.Specifications.CategorySpec
{
    public class CategoryWithFiltersSpec : BaseSpecifications<CategoryEntity, int>
    {
        public CategoryWithFiltersSpec(CategoryQueryParams queryParams, bool isCountSpec = false)
            : base(c =>
                !c.IsDeleted &&
                (string.IsNullOrEmpty(queryParams.Search) ||
                 EF.Functions.Like(c.CategoryName, $"%{queryParams.Search}%") ||
                 (c.CategoryDescription != null && EF.Functions.Like(c.CategoryDescription, $"%{queryParams.Search}%"))))
        {
            if (!isCountSpec)
            {
                AddInclude(c => c.Products);
                AddOrderBy(c => c.CategoryName, isDescending: false);
                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }
}
