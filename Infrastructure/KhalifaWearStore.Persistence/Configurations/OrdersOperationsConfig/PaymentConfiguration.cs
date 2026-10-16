using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Persistence.Configurations.OrdersOperationsConfig
{
    public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> builder)
        {
            builder.ToTable("Payments");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("paymentID");

            builder.Property(x => x.PaymentType)
                .HasColumnName("paymentType")
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();
        }
    }
}
