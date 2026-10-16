using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using KhalifaWearStore.Shared.Common.Params.Stock;
using StockEntity = KhalifaWearStore.Domain.Models.Catalog.Stock;

namespace KhalifaWearStore.Services.Specifications.StockSpec
{
    public class StockWithFiltersSpec : BaseSpecifications<StockEntity, int>
    {
        public StockWithFiltersSpec(StockQueryParams queryParams, bool isCountSpec = false)
            : base(s =>
                !s.IsDeleted &&
                (!queryParams.ProductId.HasValue || s.ProductId == queryParams.ProductId.Value) &&
                (!queryParams.InStockOnly.HasValue || !queryParams.InStockOnly.Value || s.QuantityInStock > 0) &&
                (string.IsNullOrEmpty(queryParams.Size) || s.Size.ToLower() == queryParams.Size.ToLower()) &&
                (string.IsNullOrEmpty(queryParams.Colour) || EF.Functions.Like(s.Colour, $"%{queryParams.Colour}%")) &&
                (string.IsNullOrEmpty(queryParams.Search) ||
                 EF.Functions.Like(s.Product.ProductName, $"%{queryParams.Search}%")))
        {
            if (!isCountSpec)
            {
                AddInclude(s => s.Product);
                AddOrderBy(s => s.ProductId, isDescending: false);
                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }
}
