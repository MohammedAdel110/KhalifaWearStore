using AutoMapper;
using KhalifaWearStore.Abstraction.IServices.Stock;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Services.Specifications.StockSpec;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Stock;
using KhalifaWearStore.Shared.DTOs.Stock;
using ProductEntity = KhalifaWearStore.Domain.Models.Catalog.Product;
using StockEntity = KhalifaWearStore.Domain.Models.Catalog.Stock;

namespace KhalifaWearStore.Services.ServicesImplementation.Stock
{
    public class StockService(IUnitOfWork unitOfWork, IMapper mapper) : IStockService
    {
        public async Task<PaginationResponse<StockDto>> GetAllStocksAsync(StockQueryParams queryParams)
        {
            var repo = unitOfWork.GetRepository<StockEntity, int>();

            var dataSpec = new StockWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new StockWithFiltersSpec(queryParams, isCountSpec: true);

            var stocks = await repo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await repo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<StockDto>>(stocks);

            return new PaginationResponse<StockDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<IReadOnlyList<StockDto>> GetStocksByProductIdAsync(int productId)
        {
            var repo = unitOfWork.GetRepository<StockEntity, int>();
            var spec = new StocksByProductIdSpec(productId);
            var stocks = await repo.GetAllWithSpecAsync(spec);

            return mapper.Map<IReadOnlyList<StockDto>>(stocks);
        }

        public async Task<StockDto> GetStockByIdAsync(int id)
        {
            var repo = unitOfWork.GetRepository<StockEntity, int>();
            var spec = new StockByIdWithProductSpec(id);
            var stock = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Stock entry with ID {id} was not found.");

            return mapper.Map<StockDto>(stock);
        }

        public async Task<StockDto> CreateStockAsync(CreateStockDto createDto)
        {
            var productRepo = unitOfWork.GetRepository<ProductEntity, int>();
            var product = await productRepo.GetByIdAsync(createDto.ProductId);
            if (product == null || product.IsDeleted)
                throw new BadRequestCustomeException($"Product with ID {createDto.ProductId} does not exist.");

            var stockRepo = unitOfWork.GetRepository<StockEntity, int>();
            var existingSpec = new StockByProductVariantSpec(createDto.ProductId, createDto.Size, createDto.Colour);
            var existingVariant = await stockRepo.GetByIdWithSpecAsync(existingSpec);
            if (existingVariant != null)
            {
                existingVariant.QuantityInStock = createDto.QuantityInStock;
                existingVariant.Size = createDto.Size.Trim();
                existingVariant.Colour = createDto.Colour.Trim();
                existingVariant.UpdatedAt = DateTime.UtcNow;
                stockRepo.UpdateAsync(existingVariant);
                await unitOfWork.SaveChangesAsync();
                return await GetStockByIdAsync(existingVariant.Id);
            }

            var stock = mapper.Map<StockEntity>(createDto);
            stock.Size = createDto.Size.Trim();
            stock.Colour = createDto.Colour.Trim();
            await stockRepo.AddAsync(stock);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create stock entry.");

            return await GetStockByIdAsync(stock.Id);
        }

        public async Task<StockDto> UpdateStockAsync(int id, UpdateStockDto updateDto)
        {
            var stockRepo = unitOfWork.GetRepository<StockEntity, int>();
            var spec = new StockByIdWithProductSpec(id);
            var stock = await stockRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Stock entry with ID {id} was not found.");

            mapper.Map(updateDto, stock);
            stock.UpdatedAt = DateTime.UtcNow;

            stockRepo.UpdateAsync(stock);
            await unitOfWork.SaveChangesAsync();

            return mapper.Map<StockDto>(stock);
        }

        public async Task<bool> DeleteStockAsync(int id)
        {
            var stockRepo = unitOfWork.GetRepository<StockEntity, int>();
            var stock = await stockRepo.GetByIdAsync(id);
            if (stock == null || stock.IsDeleted)
                throw new NotFoundCutomeException($"Stock entry with ID {id} was not found.");

            stock.IsDeleted = true;
            stock.UpdatedAt = DateTime.UtcNow;

            stockRepo.UpdateAsync(stock);
            return await unitOfWork.SaveChangesAsync() > 0;
        }
    }
}
