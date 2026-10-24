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
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreateOrder([FromBody] CreateOrderDto createDto)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.CreateOrderAsync(createDto, userId);
            return Created(result, "Order placed successfully");
        }

        [HttpGet("my")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<OrderDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetMyOrders([FromQuery] OrderQueryParams queryParams)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.GetMyOrdersAsync(userId, queryParams);
            return Success(result, "Your orders retrieved successfully");
        }

        [HttpGet("my/{orderId:int}")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetMyOrderDetails([FromRoute] int orderId)
        {
            var userId = GetUserIdFromToken();
            var result = await orderService.GetMyOrderDetailsAsync(orderId, userId);
            return Success(result, "Order details retrieved successfully");
        }

        [HttpGet("track")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> TrackOrderPublic([FromQuery] int orderId, [FromQuery] string phone)
        {
            var result = await orderService.TrackOrderPublicAsync(orderId, phone);
            return Success(result, "Order tracking retrieved successfully");
        }

        // =====================================================================
        // ADMIN OPERATIONS
        // =====================================================================

        [HttpGet("admin")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<OrderDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllOrders([FromQuery] OrderQueryParams queryParams)
        {
            var result = await orderService.GetAllOrdersAsync(queryParams);
            return Success(result, "Store orders retrieved successfully");
        }

        [HttpGet("admin/{orderId:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetAdminOrderDetails([FromRoute] int orderId)
        {
            var result = await orderService.GetAdminOrderDetailsAsync(orderId);
            return Success(result, "Order details retrieved successfully");
        }

        [HttpPatch("admin/{orderId:int}/payment-status")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateOrderPaymentStatus(
            [FromRoute] int orderId,
            [FromBody] UpdateOrderPaymentStatusDto updateDto)
        {
            var result = await orderService.UpdateOrderPaymentStatusAsync(orderId, updateDto);
            return Success(result, "Order payment status updated successfully");
        }

        [HttpPatch("admin/{orderId:int}/status")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<OrderDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateOrderStatus(
            [FromRoute] int orderId,
            [FromBody] UpdateOrderStatusDto updateDto)
        {
            var result = await orderService.UpdateOrderStatusAsync(orderId, updateDto);
            return Success(result, "Order fulfillment status updated successfully");
        }

        // =====================================================================
        // PROMO CODE OPERATIONS
        // =====================================================================

        [HttpGet("promo-codes")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<PromoCodeDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetActivePromoCodes()
        {
            var result = await orderService.GetActivePromoCodesAsync();
            return Success(result, "Active promo codes retrieved successfully");
        }

        [HttpGet("admin/promo-codes")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<PromoCodeDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllPromoCodesAdmin()
        {
            var result = await orderService.GetAllPromoCodesAdminAsync();
            return Success(result, "All promo codes retrieved successfully");
        }

        [HttpPost("admin/promo-codes")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PromoCodeDto>), StatusCodes.Status201Created)]
        public async Task<ActionResult> CreatePromoCode([FromBody] CreatePromoCodeDto createDto)
        {
            var result = await orderService.CreatePromoCodeAsync(createDto);
            return Created(result, "Promo code saved successfully");
        }

        [HttpPatch("admin/promo-codes/{id:int}/toggle")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PromoCodeDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult> TogglePromoCode([FromRoute] int id)
        {
            var result = await orderService.TogglePromoCodeAsync(id);
            return Success(result, "Promo code status updated successfully");
        }

        [HttpPatch("admin/promo-codes/{id:int}/feature")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PromoCodeDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult> FeaturePromoCodeOnBanner([FromRoute] int id)
        {
            var result = await orderService.FeaturePromoCodeOnBannerAsync(id);
            return Success(result, "Landing page promo banner updated successfully");
        }

        [HttpDelete("admin/promo-codes/{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        public async Task<ActionResult> DeletePromoCode([FromRoute] int id)
        {
            await orderService.DeletePromoCodeAsync(id);
            return Success("Promo code deleted successfully");
        }
    }
}
