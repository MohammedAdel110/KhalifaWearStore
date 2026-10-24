using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Catalog;

namespace KhalifaWearStore.Persistence.Configurations.CatalogConfig
{
    public class CategoryConfiguration : IEntityTypeConfiguration<Category>
    {
        public void Configure(EntityTypeBuilder<Category> builder)
        {
            builder.ToTable("Category");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("categoryID");

            builder.Property(x => x.CategoryName)
                .HasColumnName("categoryName")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.CategoryDescription)
                .HasColumnName("categoryDescription")
                .HasMaxLength(500);

            builder.Property(x => x.Image)
                .HasColumnName("image");
        }
    }
}
