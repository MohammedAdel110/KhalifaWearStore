using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Persistence.Configurations.OrdersOperationsConfig
{
    public class PromoCodeConfiguration : IEntityTypeConfiguration<PromoCode>
    {
        public void Configure(EntityTypeBuilder<PromoCode> builder)
        {
            builder.ToTable("PromoCodes");

            builder.HasKey(p => p.Id);

            builder.Property(p => p.Id)
                   .HasColumnName("promoCodeID")
                   .ValueGeneratedOnAdd();

            builder.Property(p => p.Code)
                   .HasColumnName("code")
                   .HasMaxLength(60)
                   .IsRequired();

            builder.Property(p => p.DiscountType)
                   .HasColumnName("discountType")
                   .HasMaxLength(40)
                   .HasDefaultValue("Percentage")
                   .IsRequired();

            builder.Property(p => p.DiscountValue)
                   .HasColumnName("discountValue")
                   .HasColumnType("decimal(18,2)")
                   .HasDefaultValue(0);

            builder.Property(p => p.MinOrderSubtotal)
                   .HasColumnName("minOrderSubtotal")
                   .HasColumnType("decimal(18,2)")
                   .HasDefaultValue(0);

            builder.Property(p => p.IsActive)
                   .HasColumnName("isActive")
                   .HasDefaultValue(true);

            builder.Property(p => p.Description)
                   .HasColumnName("description")
                   .HasMaxLength(250)
                   .HasDefaultValue(string.Empty);
        }
    }
}
