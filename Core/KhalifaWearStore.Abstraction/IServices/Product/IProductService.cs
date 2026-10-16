using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Product;
using KhalifaWearStore.Shared.DTOs.Product;

namespace KhalifaWearStore.Abstraction.IServices.Product
{
    public interface IProductService
    {
        Task<PaginationResponse<ProductDto>> GetAllProductsAsync(ProductQueryParams queryParams);
        Task<ProductDetailsDto> GetProductByIdAsync(int id);
        Task<ProductDetailsDto> CreateProductAsync(CreateProductDto createDto);
        Task<ProductDetailsDto> UpdateProductAsync(int id, UpdateProductDto updateDto);
        Task<bool> DeleteProductAsync(int id);
    }
}
