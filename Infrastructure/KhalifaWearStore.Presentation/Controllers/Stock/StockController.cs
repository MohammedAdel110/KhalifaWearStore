using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Stock;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Stock;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Stock;

namespace KhalifaWearStore.Presentation.Controllers.Stock
{
    [Route("api/stocks")]
    public class StockController(IStockService stockService) : AppBaseController
    {
        [HttpGet]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<StockDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllStocks([FromQuery] StockQueryParams queryParams)
        {
            var result = await stockService.GetAllStocksAsync(queryParams);
            return Success(result, "Stock entries retrieved successfully");
        }

        [HttpGet("product/{productId:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<StockDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetStocksByProductId([FromRoute] int productId)
        {
            var result = await stockService.GetStocksByProductIdAsync(productId);
            return Success(result, "Product stock variants retrieved successfully");
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<StockDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetStockById([FromRoute] int id)
        {
            var result = await stockService.GetStockByIdAsync(id);
            return Success(result, "Stock entry retrieved successfully");
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<StockDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreateStock([FromBody] CreateStockDto createDto)
        {
            var result = await stockService.CreateStockAsync(createDto);
            return Created(result, "Stock entry created successfully");
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<StockDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateStock([FromRoute] int id, [FromBody] UpdateStockDto updateDto)
        {
            var result = await stockService.UpdateStockAsync(id, updateDto);
            return Success(result, "Stock entry updated successfully");
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteStock([FromRoute] int id)
        {
            var deleted = await stockService.DeleteStockAsync(id);
            if (deleted)
                return Success("Stock entry deleted successfully");

            return BadRequestError("Failed to delete stock entry");
        }
    }
}
