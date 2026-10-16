using KhalifaWearStore.Shared.DTOs.Stock;

namespace KhalifaWearStore.Shared.DTOs.Product
{
    public class ProductDetailsDto
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ProductDescription { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public string Colour { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public bool ProductAvailable { get; set; }
        public string? Image { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<StockDto> Stocks { get; set; } = new();
    }
}
