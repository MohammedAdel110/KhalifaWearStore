namespace KhalifaWearStore.Shared.DTOs.Stock
{
    public class StockDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public string Colour { get; set; } = string.Empty;
        public int QuantityInStock { get; set; }
    }
}
