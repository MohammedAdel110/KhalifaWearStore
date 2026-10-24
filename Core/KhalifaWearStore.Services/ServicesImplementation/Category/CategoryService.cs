using AutoMapper;
using KhalifaWearStore.Abstraction.IServices.Attachment;
using KhalifaWearStore.Abstraction.IServices.Category;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Services.Specifications.CategorySpec;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Category;
using KhalifaWearStore.Shared.DTOs.Category;
using KhalifaWearStore.Shared.DTOs.Uploads;
using CategoryEntity = KhalifaWearStore.Domain.Models.Catalog.Category;

namespace KhalifaWearStore.Services.ServicesImplementation.Category
{
    public class CategoryService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        IAttachmentService attachmentService) : ICategoryService
    {
        public async Task<PaginationResponse<CategoryDto>> GetAllCategoriesAsync(CategoryQueryParams queryParams)
        {
            var repo = unitOfWork.GetRepository<CategoryEntity, int>();

            var dataSpec = new CategoryWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new CategoryWithFiltersSpec(queryParams, isCountSpec: true);

            var categories = await repo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await repo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<CategoryDto>>(categories);

            return new PaginationResponse<CategoryDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<CategoryDetailsDto> GetCategoryByIdAsync(int id)
        {
            var repo = unitOfWork.GetRepository<CategoryEntity, int>();
            var spec = new CategoryByIdWithProductsSpec(id);
            var category = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Category with ID {id} was not found.");

            return mapper.Map<CategoryDetailsDto>(category);
        }

        public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto)
        {
            var repo = unitOfWork.GetRepository<CategoryEntity, int>();
            var category = mapper.Map<CategoryEntity>(createDto);

            if (createDto.ImageFile != null && createDto.ImageFile.Length > 0)
            {
                category.Image = await attachmentService.UploadFileAsync(new UploadFileDto
                {
                    File = createDto.ImageFile,
                    FolderName = "Images/Categories"
                });
            }

            await repo.AddAsync(category);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create category.");

            return mapper.Map<CategoryDto>(category);
        }

        public async Task<CategoryDto> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto)
        {
            var repo = unitOfWork.GetRepository<CategoryEntity, int>();
            var spec = new CategoryByIdWithProductsSpec(id);
            var category = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Category with ID {id} was not found.");

            var existingImage = category.Image;
            mapper.Map(updateDto, category);
            category.UpdatedAt = DateTime.UtcNow;

            if (updateDto.ImageFile != null && updateDto.ImageFile.Length > 0)
            {
                category.Image = await attachmentService.UploadFileAsync(new UploadFileDto
                {
                    File = updateDto.ImageFile,
                    FolderName = "Images/Categories"
                });
            }
            else
            {
                category.Image = existingImage;
            }

            repo.UpdateAsync(category);
            await unitOfWork.SaveChangesAsync();

            return mapper.Map<CategoryDto>(category);
        }

        public async Task<bool> DeleteCategoryAsync(int id)
        {
            var repo = unitOfWork.GetRepository<CategoryEntity, int>();
            var spec = new CategoryByIdWithProductsSpec(id);
            var category = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Category with ID {id} was not found.");

            if (category.Products != null && category.Products.Any(p => !p.IsDeleted))
                throw new BadRequestCustomeException("Cannot delete a category that still has active products.");

            category.IsDeleted = true;
            category.UpdatedAt = DateTime.UtcNow;
            repo.UpdateAsync(category);

            return await unitOfWork.SaveChangesAsync() > 0;
        }
    }
}
