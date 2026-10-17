using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Customer;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Customer;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Customer;

namespace KhalifaWearStore.Presentation.Controllers.Customer
{
    [Route("api/customers")]
    [Authorize]
    public class CustomerController(ICustomerService customerService) : AppBaseController
    {
        private string GetUserIdFromToken()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                throw new UnauthorizedAccessException("Invalid User ID in token.");
            return userId;
        }

        [HttpGet("me")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<CustomerDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetMyProfile()
        {
            var userId = GetUserIdFromToken();
            var result = await customerService.GetMyProfileAsync(userId);
            return Success(result, "Customer profile retrieved successfully");
        }

        [HttpPut("me")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<CustomerDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> UpdateMyProfile([FromBody] CustomerToUpdateDto updateDto)
        {
            var userId = GetUserIdFromToken();
            var result = await customerService.UpdateMyProfileAsync(userId, updateDto);
            return Success(result, "Customer profile updated successfully");
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<PaginationResponse<CustomerDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllCustomers([FromQuery] CustomerQueryParams queryParams)
        {
            var result = await customerService.GetAllCustomersAsync(queryParams);
            return Success(result, "Customers retrieved successfully");
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<CustomerDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetCustomerById([FromRoute] int id)
        {
            var result = await customerService.GetCustomerByIdAsync(id);
            return Success(result, "Customer details retrieved successfully");
        }
    }
}
