using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using KhalifaWearStore.Domain.Models.Catalog;

namespace KhalifaWearStore.Persistence.Configurations.CatalogConfig
{
    public class StoredMediaConfiguration : IEntityTypeConfiguration<StoredMedia>
    {
        public void Configure(EntityTypeBuilder<StoredMedia> builder)
        {
            builder.ToTable("StoredMedia");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("mediaID");

            builder.Property(x => x.RelativePath)
                .HasColumnName("relativePath")
                .HasMaxLength(260)
                .IsRequired();

            builder.HasIndex(x => x.RelativePath)
                .IsUnique()
                .HasDatabaseName("UX_StoredMedia_RelativePath");

            builder.Property(x => x.ContentType)
                .HasColumnName("contentType")
                .HasMaxLength(80)
                .IsRequired();

            builder.Property(x => x.FileBytes)
                .HasColumnName("fileBytes")
                .IsRequired();
        }
    }
}
