using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Persistence.Configurations.OrdersOperationsConfig
{
    public class OrderDetailConfiguration : IEntityTypeConfiguration<OrderDetail>
    {
        public void Configure(EntityTypeBuilder<OrderDetail> builder)
        {
            builder.ToTable("OrderDetails");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("orderDetailsID");

            builder.Property(x => x.ProductId)
                .HasColumnName("productID")
                .IsRequired();

            builder.Property(x => x.OrderId)
                .HasColumnName("orderID")
                .IsRequired();

            builder.Property(x => x.Size)
                .HasColumnName("size")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.Colour)
                .HasColumnName("colour")
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.Quantity)
                .HasColumnName("quantity")
                .IsRequired();

            builder.Property(x => x.UnitPrice)
                .HasColumnName("unitPrice")
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.Total)
                .HasColumnName("total")
                .HasPrecision(18, 2)
                .IsRequired();

            // Relationship: Order (1) -> OrderDetails (Many)
            builder.HasOne(x => x.Order)
                .WithMany(o => o.OrderDetails)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relationship: Product (1) -> OrderDetails (Many)
            builder.HasOne(x => x.Product)
                .WithMany(p => p.OrderDetails)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
