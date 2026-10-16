using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Category;
using KhalifaWearStore.Shared.DTOs.Category;

namespace KhalifaWearStore.Abstraction.IServices.Category
{
    public interface ICategoryService
    {
        Task<PaginationResponse<CategoryDto>> GetAllCategoriesAsync(CategoryQueryParams queryParams);
        Task<CategoryDetailsDto> GetCategoryByIdAsync(int id);
        Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto);
        Task<CategoryDto> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto);
        Task<bool> DeleteCategoryAsync(int id);
    }
}
