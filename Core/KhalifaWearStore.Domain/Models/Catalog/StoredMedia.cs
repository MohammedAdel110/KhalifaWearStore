namespace KhalifaWearStore.Domain.Models.Catalog
{
    public class StoredMedia : BaseEntity<int>
    {
        public string RelativePath { get; set; } = string.Empty;
        public string ContentType { get; set; } = "image/jpeg";
        public byte[] FileBytes { get; set; } = [];
    }
}
