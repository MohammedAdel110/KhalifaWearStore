using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Catalog;

namespace KhalifaWearStore.Persistence.Configurations.CatalogConfig
{
    public class ProductConfiguration : IEntityTypeConfiguration<Product>
    {
        public void Configure(EntityTypeBuilder<Product> builder)
        {
            builder.ToTable("Products");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("productID");

            builder.Property(x => x.ProductName)
                .HasColumnName("productName")
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(x => x.ProductDescription)
                .HasColumnName("productDescription")
                .HasMaxLength(1000);

            builder.Property(x => x.CategoryId)
                .HasColumnName("categoryID")
                .IsRequired();

            builder.Property(x => x.UnitPrice)
                .HasColumnName("unitPrice")
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.Colour)
                .HasColumnName("colour")
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.Size)
                .HasColumnName("size")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.ProductAvailable)
                .HasColumnName("productAvailable")
                .IsRequired();

            builder.Property(x => x.Image)
                .HasColumnName("image")
                .HasMaxLength(500);

            builder.Property(x => x.ColorVariantsJson)
                .HasColumnName("colorVariantsJson");

            // Relationship: Category (1) -> Products (Many)
            builder.HasOne(x => x.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
