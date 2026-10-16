using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Category;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Category;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Category;

namespace KhalifaWearStore.Presentation.Controllers.Category
{
    [Route("api/categories")]
    public class CategoryController(ICategoryService categoryService) : AppBaseController
    {
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<CategoryDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllCategories([FromQuery] CategoryQueryParams queryParams)
        {
            var result = await categoryService.GetAllCategoriesAsync(queryParams);
            return Success(result, "Categories retrieved successfully");
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<CategoryDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetCategoryById([FromRoute] int id)
        {
            var result = await categoryService.GetCategoryByIdAsync(id);
            return Success(result, "Category details retrieved successfully");
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreateCategory([FromBody] CreateCategoryDto createDto)
        {
            var result = await categoryService.CreateCategoryAsync(createDto);
            return Created(result, "Category created successfully");
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateCategory([FromRoute] int id, [FromBody] UpdateCategoryDto updateDto)
        {
            var result = await categoryService.UpdateCategoryAsync(id, updateDto);
            return Success(result, "Category updated successfully");
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteCategory([FromRoute] int id)
        {
            var deleted = await categoryService.DeleteCategoryAsync(id);
            if (deleted)
                return Success("Category deleted successfully");

            return BadRequestError("Failed to delete category");
        }
    }
}
