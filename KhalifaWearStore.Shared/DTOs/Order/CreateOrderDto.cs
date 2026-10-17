using System.ComponentModel.DataAnnotations;
using KhalifaWearStore.Shared.DTOs.OrderDetail;

namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class CreateOrderDto
    {
        [Required(ErrorMessage = "Payment ID is required")]
        public int PaymentId { get; set; }

        public bool Paid { get; set; }

        [MaxLength(100)]
        public string? FirstName { get; set; }

        [MaxLength(100)]
        public string? LastName { get; set; }

        [MaxLength(30)]
        public string? PhoneNo { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [Required(ErrorMessage = "Detailed delivery address is required")]
        [MaxLength(500)]
        public string ShippingAddress { get; set; } = string.Empty;

        [MaxLength(60)]
        public string? PromoCode { get; set; }

        [Required(ErrorMessage = "Order must contain at least one item")]
        [MinLength(1, ErrorMessage = "Order must contain at least one item")]
        public List<CreateOrderDetailItemDto> Items { get; set; } = new();
    }
}
