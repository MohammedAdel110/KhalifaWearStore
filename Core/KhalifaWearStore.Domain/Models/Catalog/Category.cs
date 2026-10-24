namespace KhalifaWearStore.Domain.Models.Catalog
{
    public class Category : BaseEntity<int>
    {
        public string CategoryName { get; set; } = string.Empty;
        public string? CategoryDescription { get; set; }
        public string? Image { get; set; }

        // 1-to-Many: Category (1) -> Products (Many)
        public virtual ICollection<Product> Products { get; set; } = new HashSet<Product>();
    }
}
