using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.User;

namespace KhalifaWearStore.Persistence.Configurations.User_Profiles
{
    public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
    {
        public void Configure(EntityTypeBuilder<ApplicationUser> builder)
        {
            builder.ToTable("ApplicationUsers");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.FullName)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Role)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion<string>();
        }
    }
}
