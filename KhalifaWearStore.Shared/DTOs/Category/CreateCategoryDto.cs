using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace KhalifaWearStore.Shared.DTOs.Category
{
    public class CreateCategoryDto
    {
        [Required(ErrorMessage = "Category name is required")]
        [MaxLength(100)]
        public string CategoryName { get; set; } = null!;

        [MaxLength(500)]
        public string? CategoryDescription { get; set; }

        public IFormFile? ImageFile { get; set; }
    }
}
