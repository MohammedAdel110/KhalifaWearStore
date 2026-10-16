using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.OrderDetail
{
    public class CreateOrderDetailItemDto
    {
        [Required(ErrorMessage = "Product ID is required")]
        public int ProductId { get; set; }

        [Required(ErrorMessage = "Size is required")]
        [MaxLength(20)]
        public string Size { get; set; } = null!;

        [Required(ErrorMessage = "Colour is required")]
        [MaxLength(50)]
        public string Colour { get; set; } = null!;

        [Required(ErrorMessage = "Quantity is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }
    }
}
