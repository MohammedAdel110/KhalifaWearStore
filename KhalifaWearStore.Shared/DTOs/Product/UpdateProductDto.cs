using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace KhalifaWearStore.Shared.DTOs.Product
{
    public class UpdateProductDto
    {
        [Required(ErrorMessage = "Product name is required")]
        [MaxLength(150)]
        public string ProductName { get; set; } = null!;

        [MaxLength(1000)]
        public string? ProductDescription { get; set; }

        [Required(ErrorMessage = "Category ID is required")]
        public int CategoryId { get; set; }

        [Required(ErrorMessage = "Unit price is required")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Unit price must be greater than zero")]
        public decimal UnitPrice { get; set; }

        [Required(ErrorMessage = "Colour is required")]
        [MaxLength(50)]
        public string Colour { get; set; } = null!;

        [Required(ErrorMessage = "Size is required")]
        [MaxLength(20)]
        public string Size { get; set; } = null!;

        public bool ProductAvailable { get; set; } = true;

        public IFormFile? ImageFile { get; set; }

        public string? ColorVariantsJson { get; set; }
    }
}
