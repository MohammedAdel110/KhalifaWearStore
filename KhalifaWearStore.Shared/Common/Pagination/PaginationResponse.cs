namespace KhalifaWearStore.Shared.Common.Pagination
{
    public class PaginationResponse<TData>
    {
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public IReadOnlyList<TData> Data { get; set; }

        public PaginationResponse(int index, int size, int total, IReadOnlyList<TData> data)
        {
            PageIndex = index;
            PageSize = size;
            TotalCount = total;
            Data = data;
        }
    }
}
