using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Persistence.Configurations.OrdersOperationsConfig
{
    public class OrderConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            builder.ToTable("Order");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("orderID");

            builder.Property(x => x.OrderDate)
                .HasColumnName("orderDate")
                .IsRequired();

            builder.Property(x => x.CustomerId)
                .HasColumnName("customerID")
                .IsRequired();

            builder.Property(x => x.PaymentId)
                .HasColumnName("paymentID")
                .IsRequired();

            builder.Property(x => x.Paid)
                .HasColumnName("paid")
                .IsRequired();

            builder.Property(x => x.PaymentDate)
                .HasColumnName("paymentDate");

            builder.Property(x => x.OrderStatus)
                .HasColumnName("orderStatus")
                .HasMaxLength(40)
                .HasDefaultValue("Pending")
                .IsRequired();

            builder.Property(x => x.ShippingFee)
                .HasColumnName("shippingFee")
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m);

            builder.Property(x => x.DiscountAmount)
                .HasColumnName("discountAmount")
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m);

            builder.Property(x => x.PromoCode)
                .HasColumnName("promoCode")
                .HasMaxLength(60);

            builder.Property(x => x.ShippingAddress)
                .HasColumnName("shippingAddress")
                .HasMaxLength(500);

            builder.Property(x => x.ShippingCity)
                .HasColumnName("shippingCity")
                .HasMaxLength(100);

            builder.Property(x => x.ShippingPhoneNo)
                .HasColumnName("shippingPhoneNo")
                .HasMaxLength(30);

            // Relationship: Customer (1) -> Orders (Many)
            builder.HasOne(x => x.Customer)
                .WithMany(c => c.Orders)
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relationship: Payment (1) -> Orders (Many)
            builder.HasOne(x => x.Payment)
                .WithMany(p => p.Orders)
                .HasForeignKey(x => x.PaymentId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
