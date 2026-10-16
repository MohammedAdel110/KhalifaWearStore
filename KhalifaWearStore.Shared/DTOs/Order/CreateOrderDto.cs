using System.ComponentModel.DataAnnotations;
using KhalifaWearStore.Shared.DTOs.OrderDetail;

namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class CreateOrderDto
    {
        [Required(ErrorMessage = "Payment ID is required")]
        public int PaymentId { get; set; }

        public bool Paid { get; set; }

        [Required(ErrorMessage = "Order must contain at least one item")]
        [MinLength(1, ErrorMessage = "Order must contain at least one item")]
        public List<CreateOrderDetailItemDto> Items { get; set; } = new();
    }
}
