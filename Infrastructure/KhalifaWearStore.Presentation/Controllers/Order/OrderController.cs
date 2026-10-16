using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Order;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Order;

namespace KhalifaWearStore.Presentation.Controllers.Order
{
    [Route("api/orders")]
    [Authorize]
    public class OrderController(IOrderService orderService) : AppBaseController
    {
        private string GetUserIdFromToken()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                throw new UnauthorizedAccessException("Invalid User ID in token.");
            return userId;
        }

        // =====================================================================
        // CUSTOMER OPERATIONS
        // =====================================================================

        [HttpPost]
        [Authorize(Roles = "Customer")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreateOrder([FromBody] CreateOrderDto createDto)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.CreateOrderAsync(createDto, userId);
            return Created(result, "Order placed successfully");
        }

        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<OrderDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetMyOrders([FromQuery] OrderQueryParams queryParams)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.GetMyOrdersAsync(userId, queryParams);
            return Success(result, "Your orders retrieved successfully");
        }

        [HttpGet("my/{orderId:int}")]
        [Authorize(Roles = "Customer")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetMyOrderDetails([FromRoute] int orderId)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.GetMyOrderDetailsAsync(orderId, userId);
            return Success(result, "Order details retrieved successfully");
        }

        // =====================================================================
        // ADMIN OPERATIONS
        // =====================================================================

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<OrderDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllOrders([FromQuery] OrderQueryParams queryParams)
        {
            var result = await orderService.GetAllOrdersAsync(queryParams);
            return Success(result, "Store orders retrieved successfully");
        }

        [HttpGet("admin/{orderId:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetAdminOrderDetails([FromRoute] int orderId)
        {
            var result = await orderService.GetAdminOrderDetailsAsync(orderId);
            return Success(result, "Order details retrieved successfully");
        }

        [HttpPatch("admin/{orderId:int}/payment-status")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateOrderPaymentStatus(
            [FromRoute] int orderId,
            [FromBody] UpdateOrderPaymentStatusDto updateDto)
        {
            var result = await orderService.UpdateOrderPaymentStatusAsync(orderId, updateDto);
            return Success(result, "Order payment status updated successfully");
        }
    }
}
