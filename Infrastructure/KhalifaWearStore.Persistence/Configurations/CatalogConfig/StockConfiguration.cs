using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Catalog;

namespace KhalifaWearStore.Persistence.Configurations.CatalogConfig
{
    public class StockConfiguration : IEntityTypeConfiguration<Stock>
    {
        public void Configure(EntityTypeBuilder<Stock> builder)
        {
            builder.ToTable("Stock");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("stockID");

            builder.Property(x => x.ProductId)
                .HasColumnName("productID")
                .IsRequired();

            builder.Property(x => x.Size)
                .HasColumnName("size")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.Colour)
                .HasColumnName("colour")
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.QuantityInStock)
                .HasColumnName("quantityInStock")
                .IsRequired();

            // Relationship: Product (1) -> Stocks (Many)
            builder.HasOne(x => x.Product)
                .WithMany(p => p.Stocks)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
