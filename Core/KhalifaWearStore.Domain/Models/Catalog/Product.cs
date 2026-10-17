using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Domain.Models.Catalog
{
    public class Product : BaseEntity<int>
    {
        public string ProductName { get; set; } = string.Empty;
        public string? ProductDescription { get; set; }
        public decimal UnitPrice { get; set; }
        public string Colour { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public bool ProductAvailable { get; set; } = true;
        public string? Image { get; set; }
        public string? ColorVariantsJson { get; set; }

        // Foreign Key: Category (1) -> Products (Many)
        public int CategoryId { get; set; }
        public virtual Category Category { get; set; } = null!;

        // 1-to-Many: Product (1) -> OrderDetails (Many)
        public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new HashSet<OrderDetail>();

        // 1-to-Many: Product (1) -> Stocks (Many)
        public virtual ICollection<Stock> Stocks { get; set; } = new HashSet<Stock>();
    }
}
