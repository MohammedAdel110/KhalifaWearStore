namespace KhalifaWearStore.Domain.Models.Catalog
{
    public class Stock : BaseEntity<int>
    {
        public string Size { get; set; } = string.Empty;
        public string Colour { get; set; } = string.Empty;
        public int QuantityInStock { get; set; }

        // Foreign Key: Product (1) -> Stocks (Many)
        public int ProductId { get; set; }
        public virtual Product Product { get; set; } = null!;
    }
}
