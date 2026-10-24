using KhalifaWearStore.Shared.DTOs.Product;

namespace KhalifaWearStore.Shared.DTOs.Category
{
    public class CategoryDetailsDto
    {
        public int Id { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string? CategoryDescription { get; set; }
        public string? Image { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ProductDto> Products { get; set; } = new();
    }
}
