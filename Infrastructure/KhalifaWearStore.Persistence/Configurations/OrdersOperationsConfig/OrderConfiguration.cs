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
