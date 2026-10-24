using System.Text.Json;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
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
        IAttachmentService attachmentService,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor) : IProductService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public async Task<PaginationResponse<ProductDto>> GetAllProductsAsync(ProductQueryParams queryParams)
        {
            var repo = unitOfWork.GetRepository<ProductEntity, int>();

            var dataSpec = new ProductWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new ProductWithFiltersSpec(queryParams, isCountSpec: true);

            var products = await repo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await repo.GetCountAsync(countSpec);

            var mapped = mapper.Map<List<ProductDto>>(products);
            for (var i = 0; i < products.Count && i < mapped.Count; i++)
            {
                mapped[i].ColorVariants = BuildColorVariants(products[i], mapped[i].Image);
            }

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

            product.Stocks = product.Stocks.Where(s => !s.IsDeleted).ToList();
            var dto = mapper.Map<ProductDetailsDto>(product);
            dto.ColorVariants = BuildColorVariants(product, dto.Image);
            return dto;
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

            ApplyNormalizedColorVariantsJson(product, createDto.ColorVariantsJson);

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

            var existingColorVariantsJson = product.ColorVariantsJson;
            mapper.Map(updateDto, product);
            product.UpdatedAt = DateTime.UtcNow;

            if (updateDto.ImageFile != null && updateDto.ImageFile.Length > 0)
            {
                product.Image = await attachmentService.UploadFileAsync(new UploadFileDto
                {
                    File = updateDto.ImageFile,
                    FolderName = "Images/Products"
                });
            }

            if (!string.IsNullOrWhiteSpace(updateDto.ColorVariantsJson))
            {
                ApplyNormalizedColorVariantsJson(product, updateDto.ColorVariantsJson);
            }
            else
            {
                product.ColorVariantsJson = existingColorVariantsJson;
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

        public async Task<ProductColorVariantDto> UploadColorImageAsync(IFormFile file, string? colour, string? colorHex)
        {
            if (file == null || file.Length == 0)
                throw new BadRequestCustomeException("Image file is required.");

            var relativePath = await attachmentService.UploadFileAsync(new UploadFileDto
            {
                File = file,
                FolderName = "Images/Products"
            });

            var resolvedColour = string.IsNullOrWhiteSpace(colour) ? "Obsidian Black" : colour.Trim();
            return new ProductColorVariantDto
            {
                Colour = resolvedColour,
                ColorHex = string.IsNullOrWhiteSpace(colorHex) ? ResolveDefaultHex(resolvedColour) : colorHex.Trim(),
                Image = ResolveFullImageUrl(relativePath)
            };
        }

        private void ApplyNormalizedColorVariantsJson(ProductEntity product, string? rawJson)
        {
            if (string.IsNullOrWhiteSpace(rawJson))
                return;

            try
            {
                var parsed = JsonSerializer.Deserialize<List<ProductColorVariantDto>>(rawJson, JsonOptions);
                if (parsed == null || parsed.Count == 0)
                    return;

                var normalized = new List<ProductColorVariantDto>();
                foreach (var item in parsed)
                {
                    if (string.IsNullOrWhiteSpace(item.Colour))
                        continue;

                    var cleanColour = item.Colour.Trim();
                    var cleanHex = string.IsNullOrWhiteSpace(item.ColorHex)
                        ? ResolveDefaultHex(cleanColour)
                        : item.ColorHex.Trim();
                    var relativeImg = NormalizeToRelativeImagePath(item.Image);

                    normalized.Add(new ProductColorVariantDto
                    {
                        Colour = cleanColour,
                        ColorHex = cleanHex,
                        Image = string.IsNullOrWhiteSpace(relativeImg) ? product.Image : relativeImg
                    });
                }

                if (normalized.Count > 0)
                {
                    product.Colour = normalized[0].Colour;
                    if (!string.IsNullOrWhiteSpace(normalized[0].Image))
                    {
                        product.Image = normalized[0].Image;
                    }
                    product.ColorVariantsJson = JsonSerializer.Serialize(normalized, JsonOptions);
                }
            }
            catch
            {
                // Ignore malformed JSON
            }
        }

        private List<ProductColorVariantDto> BuildColorVariants(ProductEntity product, string? resolvedPrimaryImage)
        {
            var result = new List<ProductColorVariantDto>();

            if (!string.IsNullOrWhiteSpace(product.ColorVariantsJson))
            {
                try
                {
                    var stored = JsonSerializer.Deserialize<List<ProductColorVariantDto>>(product.ColorVariantsJson, JsonOptions);
                    if (stored != null)
                    {
                        foreach (var v in stored)
                        {
                            if (string.IsNullOrWhiteSpace(v.Colour))
                                continue;

                            var fullImg = ResolveFullImageUrl(v.Image);
                            result.Add(new ProductColorVariantDto
                            {
                                Colour = v.Colour.Trim(),
                                ColorHex = string.IsNullOrWhiteSpace(v.ColorHex)
                                    ? ResolveDefaultHex(v.Colour)
                                    : v.ColorHex.Trim(),
                                Image = string.IsNullOrWhiteSpace(fullImg) ? resolvedPrimaryImage : fullImg
                            });
                        }
                    }
                }
                catch
                {
                    // Ignore malformed JSON
                }
            }

            if (!string.IsNullOrWhiteSpace(product.Colour) &&
                !result.Any(r => string.Equals(r.Colour, product.Colour.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                result.Add(new ProductColorVariantDto
                {
                    Colour = product.Colour.Trim(),
                    ColorHex = ResolveDefaultHex(product.Colour),
                    Image = resolvedPrimaryImage
                });
            }

            if (product.Stocks != null)
            {
                foreach (var stock in product.Stocks.Where(s => !s.IsDeleted && !string.IsNullOrWhiteSpace(s.Colour)))
                {
                    var stockColour = stock.Colour.Trim();
                    if (!result.Any(r => string.Equals(r.Colour, stockColour, StringComparison.OrdinalIgnoreCase)))
                    {
                        result.Add(new ProductColorVariantDto
                        {
                            Colour = stockColour,
                            ColorHex = ResolveDefaultHex(stockColour),
                            Image = resolvedPrimaryImage
                        });
                    }
                }
            }

            return result;
        }

        private string GetEffectiveBaseUrl()
        {
            var req = httpContextAccessor.HttpContext?.Request;
            if (req != null && req.Host.HasValue)
            {
                if (req.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
                {
                    var host = req.Host.Value.Equals("localhost:5050", StringComparison.OrdinalIgnoreCase)
                        ? "localhost:7050"
                        : req.Host.Value;
                    return $"https://{host}";
                }

                var forwardedProto = req.Headers["X-Forwarded-Proto"].FirstOrDefault();
                var scheme = !string.IsNullOrEmpty(forwardedProto) ? forwardedProto : req.Scheme;
                return $"{scheme}://{req.Host}";
            }
            return (configuration["ApiBaseUrl"] ?? "https://localhost:7050").TrimEnd('/');
        }

        private string? ResolveFullImageUrl(string? path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return null;

            var trimmed = path.Trim();
            if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            var baseUrl = GetEffectiveBaseUrl();
            return $"{baseUrl}/{trimmed.TrimStart('/')}";
        }

        private string? NormalizeToRelativeImagePath(string? urlOrPath)
        {
            if (string.IsNullOrWhiteSpace(urlOrPath))
                return null;

            var trimmed = urlOrPath.Trim();
            var baseUrl = GetEffectiveBaseUrl();
            if (trimmed.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase))
            {
                return trimmed[baseUrl.Length..].TrimStart('/');
            }
            var configBase = (configuration["ApiBaseUrl"] ?? "http://localhost:5050").TrimEnd('/');
            if (trimmed.StartsWith(configBase, StringComparison.OrdinalIgnoreCase))
            {
                return trimmed[configBase.Length..].TrimStart('/');
            }
            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            {
                return uri.AbsolutePath.TrimStart('/');
            }
            return trimmed.TrimStart('/');
        }

        private static string ResolveDefaultHex(string? colourName)
        {
            if (string.IsNullOrWhiteSpace(colourName))
                return "#141519";

            var lower = colourName.Trim().ToLowerInvariant();
            if (lower.Contains("baby blue") || lower.Contains("sky") || lower.Contains("ice blue"))
                return "#89CFF0";
            if (lower.Contains("navy") || lower.Contains("midnight"))
                return "#1E293B";
            if (lower.Contains("blue") || lower.Contains("cobalt"))
                return "#3B82F6";
            if (lower.Contains("sand") || lower.Contains("beige") || lower.Contains("camel") || lower.Contains("oat") || lower.Contains("cream") || lower.Contains("ecru"))
                return "#D2B48C";
            if (lower.Contains("heather") || lower.Contains("grey") || lower.Contains("gray") || lower.Contains("ash") || lower.Contains("silver"))
                return "#9CA3AF";
            if (lower.Contains("charcoal") || lower.Contains("slate") || lower.Contains("graphite"))
                return "#374151";
            if (lower.Contains("white") || lower.Contains("ivory") || lower.Contains("snow"))
                return "#F8FAFC";
            if (lower.Contains("olive") || lower.Contains("sage") || lower.Contains("khaki") || lower.Contains("moss") || lower.Contains("forest") || lower.Contains("green"))
                return "#4D5D53";
            if (lower.Contains("burgundy") || lower.Contains("maroon") || lower.Contains("wine") || lower.Contains("crimson") || lower.Contains("red"))
                return "#7F1D1D";
            if (lower.Contains("brown") || lower.Contains("mocha") || lower.Contains("espresso") || lower.Contains("chocolate"))
                return "#5C4033";
            if (lower.Contains("purple") || lower.Contains("lavender") || lower.Contains("plum"))
                return "#6D28D9";
            if (lower.Contains("pink") || lower.Contains("rose") || lower.Contains("blush"))
                return "#F472B6";
            if (lower.Contains("yellow") || lower.Contains("gold") || lower.Contains("mustard"))
                return "#EAB308";
            if (lower.Contains("orange") || lower.Contains("rust") || lower.Contains("terracotta"))
                return "#EA580C";
            return "#141519";
        }
    }
}
