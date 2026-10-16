namespace KhalifaWearStore.Shared.Common.Params.Product
{
    public class ProductQueryParams : BaseQueryParam
    {
        public int? CategoryId { get; set; }
        public string? Colour { get; set; }
        public string? Size { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public bool? ProductAvailable { get; set; }
        public string? Sort { get; set; }
    }
}
