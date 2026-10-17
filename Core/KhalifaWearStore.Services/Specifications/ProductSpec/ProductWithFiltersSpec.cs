using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using KhalifaWearStore.Shared.Common.Params.Product;
using ProductEntity = KhalifaWearStore.Domain.Models.Catalog.Product;

namespace KhalifaWearStore.Services.Specifications.ProductSpec
{
    public class ProductWithFiltersSpec : BaseSpecifications<ProductEntity, int>
    {
        public ProductWithFiltersSpec(ProductQueryParams queryParams, bool isCountSpec = false)
            : base(p =>
                !p.IsDeleted &&
                (!queryParams.CategoryId.HasValue || p.CategoryId == queryParams.CategoryId.Value) &&
                (!queryParams.ProductAvailable.HasValue || p.ProductAvailable == queryParams.ProductAvailable.Value) &&
                (!queryParams.MinPrice.HasValue || p.UnitPrice >= queryParams.MinPrice.Value) &&
                (!queryParams.MaxPrice.HasValue || p.UnitPrice <= queryParams.MaxPrice.Value) &&
                (string.IsNullOrEmpty(queryParams.Colour) || EF.Functions.Like(p.Colour, $"%{queryParams.Colour}%")) &&
                (string.IsNullOrEmpty(queryParams.Size) || p.Size.ToLower() == queryParams.Size.ToLower()) &&
                (string.IsNullOrEmpty(queryParams.Search) ||
                 EF.Functions.Like(p.ProductName, $"%{queryParams.Search}%") ||
                 (p.ProductDescription != null && EF.Functions.Like(p.ProductDescription, $"%{queryParams.Search}%"))))
        {
            if (!isCountSpec)
            {
                AddInclude(p => p.Category);
                AddInclude(p => p.Stocks);

                switch (queryParams.Sort?.ToLowerInvariant())
                {
                    case "priceasc":
                        AddOrderBy(p => p.UnitPrice, isDescending: false);
                        break;
                    case "pricedesc":
                        AddOrderBy(p => p.UnitPrice, isDescending: true);
                        break;
                    case "nameasc":
                        AddOrderBy(p => p.ProductName, isDescending: false);
                        break;
                    case "namedesc":
                        AddOrderBy(p => p.ProductName, isDescending: true);
                        break;
                    default:
                        AddOrderBy(p => p.CreatedAt, isDescending: true);
                        break;
                }

                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }
}
