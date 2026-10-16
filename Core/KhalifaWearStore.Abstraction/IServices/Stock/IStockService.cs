using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Stock;
using KhalifaWearStore.Shared.DTOs.Stock;

namespace KhalifaWearStore.Abstraction.IServices.Stock
{
    public interface IStockService
    {
        Task<PaginationResponse<StockDto>> GetAllStocksAsync(StockQueryParams queryParams);
        Task<IReadOnlyList<StockDto>> GetStocksByProductIdAsync(int productId);
        Task<StockDto> GetStockByIdAsync(int id);
        Task<StockDto> CreateStockAsync(CreateStockDto createDto);
        Task<StockDto> UpdateStockAsync(int id, UpdateStockDto updateDto);
        Task<bool> DeleteStockAsync(int id);
    }
}
