using AutoMapper;
using KhalifaWearStore.Abstraction.IServices.Attachment;
using KhalifaWearStore.Abstraction.IServices.Product;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Services.Specifications.ProductSpec;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Product;
using KhalifaWearStore.Shared.DTOs.Product;
using KhalifaWearStore.Shared.DTOs.Uploads;
using CategoryEntity = KhalifaWearStore.Domain.Models.Catalog.Category;
using ProductEntity = KhalifaWearStore.Domain.Models.Catalog.Product;

namespace KhalifaWearStore.Services.ServicesImplementation.Product
{
    public class ProductService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        IAttachmentService attachmentService) : IProductService
    {
        public async Task<PaginationResponse<ProductDto>> GetAllProductsAsync(ProductQueryParams queryParams)
        {
            var repo = unitOfWork.GetRepository<ProductEntity, int>();

            var dataSpec = new ProductWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new ProductWithFiltersSpec(queryParams, isCountSpec: true);

            var products = await repo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await repo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<ProductDto>>(products);

            return new PaginationResponse<ProductDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<ProductDetailsDto> GetProductByIdAsync(int id)
        {
            var repo = unitOfWork.GetRepository<ProductEntity, int>();
            var spec = new ProductByIdWithDetailsSpec(id);
            var product = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Product with ID {id} was not found.");

            return mapper.Map<ProductDetailsDto>(product);
        }

        public async Task<ProductDetailsDto> CreateProductAsync(CreateProductDto createDto)
        {
            var categoryRepo = unitOfWork.GetRepository<CategoryEntity, int>();
            var category = await categoryRepo.GetByIdAsync(createDto.CategoryId);
            if (category == null || category.IsDeleted)
                throw new BadRequestCustomeException($"Category with ID {createDto.CategoryId} does not exist.");

            var product = mapper.Map<ProductEntity>(createDto);

            if (createDto.ImageFile != null && createDto.ImageFile.Length > 0)
            {
                product.Image = await attachmentService.UploadFileAsync(new UploadFileDto
                {
                    File = createDto.ImageFile,
                    FolderName = "Images/Products"
                });
            }

            var productRepo = unitOfWork.GetRepository<ProductEntity, int>();
            await productRepo.AddAsync(product);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create product.");

            return await GetProductByIdAsync(product.Id);
        }

        public async Task<ProductDetailsDto> UpdateProductAsync(int id, UpdateProductDto updateDto)
        {
            var productRepo = unitOfWork.GetRepository<ProductEntity, int>();
            var spec = new ProductByIdWithDetailsSpec(id);
            var product = await productRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Product with ID {id} was not found.");

            var categoryRepo = unitOfWork.GetRepository<CategoryEntity, int>();
            var category = await categoryRepo.GetByIdAsync(updateDto.CategoryId);
            if (category == null || category.IsDeleted)
                throw new BadRequestCustomeException($"Category with ID {updateDto.CategoryId} does not exist.");

            mapper.Map(updateDto, product);
            product.UpdatedAt = DateTime.UtcNow;

            if (updateDto.ImageFile != null && updateDto.ImageFile.Length > 0)
            {
                if (!string.IsNullOrEmpty(product.Image))
                {
                    await attachmentService.DeleteFileAsync(product.Image);
                }

                product.Image = await attachmentService.UploadFileAsync(new UploadFileDto
                {
                    File = updateDto.ImageFile,
                    FolderName = "Images/Products"
                });
            }

            productRepo.UpdateAsync(product);
            await unitOfWork.SaveChangesAsync();

            return await GetProductByIdAsync(product.Id);
        }

        public async Task<bool> DeleteProductAsync(int id)
        {
            var productRepo = unitOfWork.GetRepository<ProductEntity, int>();
            var product = await productRepo.GetByIdAsync(id);
            if (product == null || product.IsDeleted)
                throw new NotFoundCutomeException($"Product with ID {id} was not found.");

            product.IsDeleted = true;
            product.ProductAvailable = false;
            product.UpdatedAt = DateTime.UtcNow;

            productRepo.UpdateAsync(product);
            return await unitOfWork.SaveChangesAsync() > 0;
        }
    }
}
