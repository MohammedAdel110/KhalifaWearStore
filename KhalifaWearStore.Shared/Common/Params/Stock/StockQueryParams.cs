namespace KhalifaWearStore.Shared.Common.Params.Stock
{
    public class StockQueryParams : BaseQueryParam
    {
        public int? ProductId { get; set; }
        public string? Size { get; set; }
        public string? Colour { get; set; }
        public bool? InStockOnly { get; set; }
    }
}
