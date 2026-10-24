using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using KhalifaWearStore.Abstraction.IServices.Payment;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Payment;

namespace KhalifaWearStore.Presentation.Controllers.Payment
{
    [Route("api/payments")]
    public class PaymentController(IPaymentService paymentService) : AppBaseController
    {
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<PaymentDto>>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAllPayments()
        {
            var result = await paymentService.GetAllPaymentsAsync();
            return Success(result, "Payment methods retrieved successfully");
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<PaymentDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> GetPaymentById([FromRoute] int id)
        {
            var result = await paymentService.GetPaymentByIdAsync(id);
            return Success(result, "Payment method retrieved successfully");
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<PaymentDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> CreatePayment([FromBody] CreatePaymentDto createDto)
        {
            var result = await paymentService.CreatePaymentAsync(createDto);
            return Created(result, "Payment method created successfully");
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeletePayment([FromRoute] int id)
        {
            var deleted = await paymentService.DeletePaymentAsync(id);
            if (deleted)
                return Success("Payment method deleted successfully");

            return BadRequestError("Failed to delete payment method");
        }
    }
}
