using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Stock
{
    public class UpdateStockDto
    {
        [Required(ErrorMessage = "Size is required")]
        [MaxLength(20)]
        public string Size { get; set; } = null!;

        [Required(ErrorMessage = "Colour is required")]
        [MaxLength(50)]
        public string Colour { get; set; } = null!;

        [Range(0, int.MaxValue, ErrorMessage = "Quantity in stock cannot be negative")]
        public int QuantityInStock { get; set; }
    }
}
