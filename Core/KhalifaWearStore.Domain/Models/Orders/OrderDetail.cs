using KhalifaWearStore.Domain.Models.Catalog;

namespace KhalifaWearStore.Domain.Models.Orders
{
    public class OrderDetail : BaseEntity<int>
    {
        public string Size { get; set; } = string.Empty;
        public string Colour { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Total { get; set; }

        // Foreign Key: Product (1) -> OrderDetails (Many)
        public int ProductId { get; set; }
        public virtual Product Product { get; set; } = null!;

        // Foreign Key: Order (1) -> OrderDetails (Many)
        public int OrderId { get; set; }
        public virtual Order Order { get; set; } = null!;
    }
}
