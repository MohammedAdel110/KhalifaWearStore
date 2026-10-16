using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Product;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Product;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Product;

namespace KhalifaWearStore.Presentation.Controllers.Product
{
    [Route("api/products")]
    public class ProductController(IProductService productService) : AppBaseController
    {
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<ProductDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllProducts([FromQuery] ProductQueryParams queryParams)
        {
            var result = await productService.GetAllProductsAsync(queryParams);
            return Success(result, "Products retrieved successfully");
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<ProductDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetProductById([FromRoute] int id)
        {
            var result = await productService.GetProductByIdAsync(id);
            return Success(result, "Product details retrieved successfully");
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<ProductDetailsDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreateProduct([FromForm] CreateProductDto createDto)
        {
            var result = await productService.CreateProductAsync(createDto);
            return Created(result, "Product created successfully");
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<ProductDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateProduct([FromRoute] int id, [FromForm] UpdateProductDto updateDto)
        {
            var result = await productService.UpdateProductAsync(id, updateDto);
            return Success(result, "Product updated successfully");
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteProduct([FromRoute] int id)
        {
            var deleted = await productService.DeleteProductAsync(id);
            if (deleted)
                return Success("Product deleted successfully");

            return BadRequestError("Failed to delete product");
        }
    }
}
