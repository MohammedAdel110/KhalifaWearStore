using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.User;

namespace KhalifaWearStore.Persistence.Configurations.User_Profiles
{
    public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
    {
        public void Configure(EntityTypeBuilder<Customer> builder)
        {
            builder.ToTable("Customers");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("customerID");

            builder.Property(x => x.FirstName)
                .HasColumnName("firstName")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.LastName)
                .HasColumnName("lastName")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.City)
                .HasColumnName("city")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Postcode)
                .HasColumnName("postcode")
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.PhoneNo)
                .HasColumnName("phoneNo")
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.Email)
                .HasColumnName("email")
                .HasMaxLength(150)
                .IsRequired();

            builder.HasIndex(x => x.Email).IsUnique();

            // 1-to-1 Relationship: Customer -> ApplicationUser
            builder.HasOne(x => x.ApplicationUser)
                .WithOne(u => u.CustomerProfile)
                .HasForeignKey<Customer>(x => x.ApplicationUserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
