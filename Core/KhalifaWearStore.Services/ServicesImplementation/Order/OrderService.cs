using AutoMapper;
using Microsoft.AspNetCore.Identity;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Domain.Models.Orders;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Services.Specifications.CustomerSpec;
using KhalifaWearStore.Services.Specifications.OrderSpec;
using KhalifaWearStore.Services.Specifications.StockSpec;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Order;
using KhalifaWearStore.Shared.DTOs.Order;
using CustomerEntity = KhalifaWearStore.Domain.Models.User.Customer;
using OrderEntity = KhalifaWearStore.Domain.Models.Orders.Order;
using PaymentEntity = KhalifaWearStore.Domain.Models.Orders.Payment;
using ProductEntity = KhalifaWearStore.Domain.Models.Catalog.Product;
using StockEntity = KhalifaWearStore.Domain.Models.Catalog.Stock;

namespace KhalifaWearStore.Services.ServicesImplementation.Order
{
    public class OrderService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        UserManager<ApplicationUser> userManager,
        IOrderNotificationService orderNotificationService) : IOrderService
    {
        private async Task<CustomerEntity> GetValidCustomerAsync(string applicationUserId)
        {
            var customerRepo = unitOfWork.GetRepository<CustomerEntity, int>();
            var spec = new CustomerByAppUserIdSpec(applicationUserId);
            var customer = await customerRepo.GetByIdWithSpecAsync(spec);
            if (customer != null)
                return customer;

            var appUser = await userManager.FindByIdAsync(applicationUserId)
                ?? throw new BadRequestCustomeException("Customer profile not found for this user.");

            var nameParts = (appUser.FullName ?? string.Empty)
                .Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = nameParts.Length > 0 ? nameParts[0] : "Khalifa";
            var lastName = nameParts.Length > 1 ? nameParts[1] : "Member";

            customer = new CustomerEntity
            {
                FirstName = firstName,
                LastName = lastName,
                Email = appUser.Email ?? string.Empty,
                PhoneNo = !string.IsNullOrWhiteSpace(appUser.PhoneNumber) ? appUser.PhoneNumber : string.Empty,
                City = "Cairo",
                Postcode = "00000",
                Address = string.Empty,
                ApplicationUserId = appUser.Id
            };

            await customerRepo.AddAsync(customer);
            await unitOfWork.SaveChangesAsync();

            return customer;
        }

        public async Task<OrderDetailsDto> CreateOrderAsync(CreateOrderDto createDto, string applicationUserId)
        {
            var customer = await GetValidCustomerAsync(applicationUserId);
            var customerRepo = unitOfWork.GetRepository<CustomerEntity, int>();

            if (!string.IsNullOrWhiteSpace(createDto.FirstName))
                customer.FirstName = createDto.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(createDto.LastName))
                customer.LastName = createDto.LastName.Trim();
            if ((string.IsNullOrWhiteSpace(customer.PhoneNo) || customer.PhoneNo == "0000000000") &&
                !string.IsNullOrWhiteSpace(createDto.PhoneNo))
            {
                var candidatePhone = createDto.PhoneNo.Trim();
                var allCustomers = await customerRepo.GetAllAsync();
                var phoneTaken = allCustomers.Any(c => c.Id != customer.Id && c.PhoneNo == candidatePhone);
                if (!phoneTaken)
                    customer.PhoneNo = candidatePhone;
            }
            if (!string.IsNullOrWhiteSpace(createDto.City))
                customer.City = createDto.City.Trim();
            if (!string.IsNullOrWhiteSpace(createDto.ShippingAddress))
                customer.Address = createDto.ShippingAddress.Trim();

            customer.UpdatedAt = DateTime.UtcNow;
            customerRepo.UpdateAsync(customer);

            var paymentRepo = unitOfWork.GetRepository<PaymentEntity, int>();
            var payment = await paymentRepo.GetByIdAsync(createDto.PaymentId);
            if (payment == null || payment.IsDeleted)
                throw new BadRequestCustomeException($"Payment method with ID {createDto.PaymentId} does not exist.");

            if (createDto.Items == null || !createDto.Items.Any())
                throw new BadRequestCustomeException("Order must contain at least one item.");

            var productRepo = unitOfWork.GetRepository<ProductEntity, int>();
            var stockRepo = unitOfWork.GetRepository<StockEntity, int>();

            var orderDetails = new List<OrderDetail>();

            foreach (var item in createDto.Items)
            {
                if (item.Quantity <= 0 || item.Quantity > 100)
                    throw new BadRequestCustomeException("Item quantity must be between 1 and 100.");

                var product = await productRepo.GetByIdAsync(item.ProductId);
                if (product == null || product.IsDeleted || !product.ProductAvailable)
                    throw new BadRequestCustomeException($"Product with ID {item.ProductId} is not available.");

                var stockSpec = new StockByProductVariantSpec(item.ProductId, item.Size, item.Colour);
                var stockVariant = await stockRepo.GetByIdWithSpecAsync(stockSpec);

                if (stockVariant == null)
                {
                    var productStocks = await stockRepo.GetAllWithSpecAsync(new StocksByProductIdSpec(item.ProductId));
                    stockVariant = productStocks.FirstOrDefault(s =>
                        s.Size.Trim().Equals(item.Size.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                if (stockVariant == null)
                    throw new BadRequestCustomeException($"Size '{item.Size}' is not available in stock for '{product.ProductName}'.");

                if (stockVariant.QuantityInStock < item.Quantity)
                    throw new BadRequestCustomeException($"Insufficient stock for '{product.ProductName}' ({stockVariant.Size} / {stockVariant.Colour}). Available: {stockVariant.QuantityInStock}.");

                stockVariant.QuantityInStock -= item.Quantity;
                stockVariant.UpdatedAt = DateTime.UtcNow;
                stockRepo.UpdateAsync(stockVariant);

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    Size = stockVariant.Size,
                    Colour = stockVariant.Colour,
                    Quantity = item.Quantity,
                    UnitPrice = product.UnitPrice,
                    Total = product.UnitPrice * item.Quantity
                });
            }

            var shippingAddress = createDto.ShippingAddress?.Trim() ?? customer.Address;
            var shippingCity = !string.IsNullOrWhiteSpace(createDto.City) ? createDto.City.Trim() : customer.City;
            var shippingPhoneNo = !string.IsNullOrWhiteSpace(createDto.PhoneNo) ? createDto.PhoneNo.Trim() : customer.PhoneNo;

            var subtotal = orderDetails.Sum(d => d.Total);
            var (shippingFee, discountAmount, appliedPromoCode) = await CalculateShippingAndPromoAsync(
                subtotal,
                shippingCity,
                createDto.PromoCode);

            var order = new OrderEntity
            {
                CustomerId = customer.Id,
                PaymentId = payment.Id,
                OrderDate = DateTime.UtcNow,
                Paid = false,
                PaymentDate = null,
                OrderStatus = "Pending",
                ShippingFee = shippingFee,
                DiscountAmount = discountAmount,
                PromoCode = appliedPromoCode,
                ShippingAddress = shippingAddress,
                ShippingCity = shippingCity,
                ShippingPhoneNo = shippingPhoneNo,
                CreatedBy = applicationUserId,
                OrderDetails = orderDetails
            };

            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            await orderRepo.AddAsync(order);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create order.");

            var createdOrderDetails = await GetAdminOrderDetailsAsync(order.Id);

            // Broadcast real-time notification to connected Store Owner & Sales Admins via SignalR
            try
            {
                await orderNotificationService.NotifyNewOrderAsync(createdOrderDetails);
            }
            catch
            {
                // Do not fail customer checkout if SignalR broadcast encounters a transient issue
            }

            return createdOrderDetails;
        }

        private async Task<(decimal ShippingFee, decimal DiscountAmount, string? AppliedPromoCode)> CalculateShippingAndPromoAsync(
            decimal subtotal,
            string? city,
            string? rawPromoCode)
        {
            var normalizedCity = (city ?? "Cairo").Trim().ToLowerInvariant();
            decimal baseShippingFee;

            if (normalizedCity.Contains("cairo") ||
                normalizedCity.Contains("giza") ||
                normalizedCity.Contains("october") ||
                normalizedCity.Contains("zayed") ||
                normalizedCity.Contains("helwan") ||
                normalizedCity.Contains("obour"))
            {
                baseShippingFee = 75m;
            }
            else if (normalizedCity.Contains("alex") ||
                     normalizedCity.Contains("mansoura") ||
                     normalizedCity.Contains("tanta") ||
                     normalizedCity.Contains("zagazig") ||
                     normalizedCity.Contains("ismailia") ||
                     normalizedCity.Contains("suez") ||
                     normalizedCity.Contains("port said") ||
                     normalizedCity.Contains("damietta") ||
                     normalizedCity.Contains("banha") ||
                     normalizedCity.Contains("damanhour") ||
                     normalizedCity.Contains("shebin") ||
                     normalizedCity.Contains("kafr"))
            {
                baseShippingFee = 90m;
            }
            else
            {
                baseShippingFee = 120m;
            }

            // Free shipping threshold on orders >= 2500 EGP
            var shippingFee = subtotal >= 2500m ? 0m : baseShippingFee;
            var discountAmount = 0m;
            string? appliedPromo = null;

            var code = (rawPromoCode ?? string.Empty).Trim().ToUpperInvariant();
            if (!string.IsNullOrEmpty(code))
            {
                var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
                var allPromos = await promoRepo.GetAllAsync();
                var dbPromo = allPromos.FirstOrDefault(p =>
                    !p.IsDeleted &&
                    p.IsActive &&
                    string.Equals(p.Code.Trim(), code, StringComparison.OrdinalIgnoreCase));

                if (dbPromo != null && subtotal >= dbPromo.MinOrderSubtotal)
                {
                    if (string.Equals(dbPromo.DiscountType, "Percentage", StringComparison.OrdinalIgnoreCase))
                    {
                        var pct = Math.Clamp(dbPromo.DiscountValue, 0m, 100m);
                        discountAmount = Math.Round(subtotal * (pct / 100m), 0);
                        appliedPromo = dbPromo.Code.ToUpperInvariant();
                    }
                    else if (string.Equals(dbPromo.DiscountType, "FixedAmount", StringComparison.OrdinalIgnoreCase))
                    {
                        discountAmount = Math.Min(subtotal, Math.Max(0m, dbPromo.DiscountValue));
                        appliedPromo = dbPromo.Code.ToUpperInvariant();
                    }
                    else if (string.Equals(dbPromo.DiscountType, "FreeShipping", StringComparison.OrdinalIgnoreCase))
                    {
                        shippingFee = 0m;
                        appliedPromo = dbPromo.Code.ToUpperInvariant();
                    }
                }
            }

            return (shippingFee, discountAmount, appliedPromo);
        }

        public async Task<PaginationResponse<OrderDto>> GetMyOrdersAsync(string applicationUserId, OrderQueryParams queryParams)
        {
            var customer = await GetValidCustomerAsync(applicationUserId);
            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();

            var dataSpec = new CustomerOrdersSpec(customer.Id, queryParams, isCountSpec: false);
            var countSpec = new CustomerOrdersSpec(customer.Id, queryParams, isCountSpec: true);

            var orders = await orderRepo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await orderRepo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<OrderDto>>(orders);

            return new PaginationResponse<OrderDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<OrderDetailsDto> GetMyOrderDetailsAsync(int orderId, string applicationUserId)
        {
            var customer = await GetValidCustomerAsync(applicationUserId);
            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            var spec = new OrderByIdWithDetailsSpec(orderId);
            var order = await orderRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Order with ID {orderId} was not found.");

            if (order.CustomerId != customer.Id)
                throw new NotFoundCutomeException($"Order with ID {orderId} was not found.");

            return mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> TrackOrderPublicAsync(int orderId, string phoneNo)
        {
            if (string.IsNullOrWhiteSpace(phoneNo))
                throw new BadRequestCustomeException("Phone number is required to track an order.");

            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            var spec = new OrderByIdWithDetailsSpec(orderId);
            var order = await orderRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Order #{orderId} was not found.");

            var cleanInputPhone = new string(phoneNo.Where(char.IsDigit).ToArray());
            var orderPhone = !string.IsNullOrWhiteSpace(order.ShippingPhoneNo)
                ? order.ShippingPhoneNo
                : order.Customer?.PhoneNo ?? string.Empty;
            var cleanOrderPhone = new string(orderPhone.Where(char.IsDigit).ToArray());

            if (cleanInputPhone.Length < 4 ||
                (!cleanOrderPhone.EndsWith(cleanInputPhone) && !cleanInputPhone.EndsWith(cleanOrderPhone)))
            {
                throw new BadRequestCustomeException("Phone number does not match the delivery phone on this order.");
            }

            return mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<PaginationResponse<OrderDto>> GetAllOrdersAsync(OrderQueryParams queryParams)
        {
            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();

            var dataSpec = new OrdersWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new OrdersWithFiltersSpec(queryParams, isCountSpec: true);

            var orders = await orderRepo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await orderRepo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<OrderDto>>(orders);

            return new PaginationResponse<OrderDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<OrderDetailsDto> GetAdminOrderDetailsAsync(int orderId)
        {
            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            var spec = new OrderByIdWithDetailsSpec(orderId);
            var order = await orderRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Order with ID {orderId} was not found.");

            return mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> UpdateOrderPaymentStatusAsync(int orderId, UpdateOrderPaymentStatusDto updateDto)
        {
            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            var spec = new OrderByIdWithDetailsSpec(orderId);
            var order = await orderRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Order with ID {orderId} was not found.");

            order.Paid = updateDto.Paid;
            order.PaymentDate = updateDto.Paid ? (updateDto.PaymentDate ?? DateTime.UtcNow) : null;
            if (updateDto.Paid && string.Equals(order.OrderStatus, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                order.OrderStatus = "Confirmed";
            }
            order.UpdatedAt = DateTime.UtcNow;

            orderRepo.UpdateAsync(order);
            await unitOfWork.SaveChangesAsync();

            var updatedOrderDetails = mapper.Map<OrderDetailsDto>(order);

            try
            {
                await orderNotificationService.NotifyOrderPaymentUpdatedAsync(updatedOrderDetails);
            }
            catch
            {
                // Ignore transient SignalR broadcast errors
            }

            return updatedOrderDetails;
        }

        public async Task<OrderDetailsDto> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusDto updateDto)
        {
            var allowedStatuses = new[] { "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled" };
            var targetStatus = allowedStatuses.FirstOrDefault(s =>
                s.Equals(updateDto.OrderStatus?.Trim(), StringComparison.OrdinalIgnoreCase))
                ?? throw new BadRequestCustomeException("Invalid order status. Allowed: Pending, Confirmed, Shipped, Delivered, Cancelled.");

            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            var stockRepo = unitOfWork.GetRepository<StockEntity, int>();
            var spec = new OrderByIdWithDetailsSpec(orderId);
            var order = await orderRepo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Order with ID {orderId} was not found.");

            var previousStatus = string.IsNullOrWhiteSpace(order.OrderStatus) ? "Pending" : order.OrderStatus;
            var wasCancelled = previousStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase);
            var willBeCancelled = targetStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase);

            // Automatic stock restoration when transitioning to Cancelled
            if (!wasCancelled && willBeCancelled && order.OrderDetails != null)
            {
                foreach (var detail in order.OrderDetails)
                {
                    var stockSpec = new StockByProductVariantSpec(detail.ProductId, detail.Size, detail.Colour);
                    var stockVariant = await stockRepo.GetByIdWithSpecAsync(stockSpec);
                    if (stockVariant != null)
                    {
                        stockVariant.QuantityInStock += detail.Quantity;
                        stockVariant.UpdatedAt = DateTime.UtcNow;
                        stockRepo.UpdateAsync(stockVariant);
                    }
                }
            }
            // If re-activating a previously Cancelled order, deduct stock again
            else if (wasCancelled && !willBeCancelled && order.OrderDetails != null)
            {
                foreach (var detail in order.OrderDetails)
                {
                    var stockSpec = new StockByProductVariantSpec(detail.ProductId, detail.Size, detail.Colour);
                    var stockVariant = await stockRepo.GetByIdWithSpecAsync(stockSpec);
                    if (stockVariant != null)
                    {
                        stockVariant.QuantityInStock = Math.Max(0, stockVariant.QuantityInStock - detail.Quantity);
                        stockVariant.UpdatedAt = DateTime.UtcNow;
                        stockRepo.UpdateAsync(stockVariant);
                    }
                }
            }

            order.OrderStatus = targetStatus;
            if (targetStatus.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
            {
                order.Paid = true;
                order.PaymentDate ??= DateTime.UtcNow;
            }
            else if (willBeCancelled)
            {
                order.Paid = false;
                order.PaymentDate = null;
            }

            order.UpdatedAt = DateTime.UtcNow;
            orderRepo.UpdateAsync(order);
            await unitOfWork.SaveChangesAsync();

            var updatedOrderDetails = mapper.Map<OrderDetailsDto>(order);

            try
            {
                await orderNotificationService.NotifyOrderPaymentUpdatedAsync(updatedOrderDetails);
            }
            catch
            {
                // Ignore transient SignalR broadcast errors
            }

            return updatedOrderDetails;
        }

        // =====================================================================
        // PROMO CODE OPERATIONS
        // =====================================================================

        private static PromoCodeDto MapPromoCode(PromoCode entity) => new()
        {
            Id = entity.Id,
            Code = entity.Code.ToUpperInvariant(),
            DiscountType = entity.DiscountType,
            DiscountValue = entity.DiscountValue,
            MinOrderSubtotal = entity.MinOrderSubtotal,
            IsActive = entity.IsActive,
            IsFeaturedOnBanner = entity.IsFeaturedOnBanner,
            Description = entity.Description,
            CreatedAt = entity.CreatedAt
        };

        public async Task<IReadOnlyList<PromoCodeDto>> GetActivePromoCodesAsync()
        {
            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var all = await promoRepo.GetAllAsync();
            return all
                .Where(p => !p.IsDeleted && p.IsActive)
                .OrderByDescending(p => p.IsFeaturedOnBanner)
                .ThenByDescending(p => p.CreatedAt)
                .Select(MapPromoCode)
                .ToList();
        }

        public async Task<IReadOnlyList<PromoCodeDto>> GetAllPromoCodesAdminAsync()
        {
            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var all = await promoRepo.GetAllAsync();
            return all
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.IsFeaturedOnBanner)
                .ThenByDescending(p => p.CreatedAt)
                .Select(MapPromoCode)
                .ToList();
        }

        public async Task<PromoCodeDto> CreatePromoCodeAsync(CreatePromoCodeDto createDto)
        {
            var cleanCode = (createDto.Code ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", "");
            if (string.IsNullOrWhiteSpace(cleanCode))
                throw new BadRequestCustomeException("Promo code cannot be empty.");

            var discountType = (createDto.DiscountType ?? "Percentage").Trim();
            if (!discountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) &&
                !discountType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase) &&
                !discountType.Equals("FreeShipping", StringComparison.OrdinalIgnoreCase))
            {
                throw new BadRequestCustomeException("DiscountType must be 'Percentage', 'FixedAmount', or 'FreeShipping'.");
            }

            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var existingList = await promoRepo.GetAllAsync();
            var existing = existingList.FirstOrDefault(p =>
                !p.IsDeleted &&
                string.Equals(p.Code.Trim(), cleanCode, StringComparison.OrdinalIgnoreCase));

            var description = !string.IsNullOrWhiteSpace(createDto.Description)
                ? createDto.Description.Trim()
                : discountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
                    ? $"{createDto.DiscountValue}% OFF" + (createDto.MinOrderSubtotal > 0 ? $" orders >= {createDto.MinOrderSubtotal:N0} EGP" : " any order")
                    : discountType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase)
                        ? $"{createDto.DiscountValue:N0} EGP OFF" + (createDto.MinOrderSubtotal > 0 ? $" orders >= {createDto.MinOrderSubtotal:N0} EGP" : " any order")
                        : "Free Express Delivery";

            if (createDto.IsFeaturedOnBanner)
            {
                foreach (var other in existingList.Where(p => !p.IsDeleted && p.IsFeaturedOnBanner))
                {
                    other.IsFeaturedOnBanner = false;
                    promoRepo.UpdateAsync(other);
                }
            }

            if (existing != null)
            {
                existing.DiscountType = discountType;
                existing.DiscountValue = Math.Max(0m, createDto.DiscountValue);
                existing.MinOrderSubtotal = Math.Max(0m, createDto.MinOrderSubtotal);
                existing.Description = description;
                existing.IsActive = true;
                existing.IsFeaturedOnBanner = createDto.IsFeaturedOnBanner || existing.IsFeaturedOnBanner;
                existing.UpdatedAt = DateTime.UtcNow;
                promoRepo.UpdateAsync(existing);
                await unitOfWork.SaveChangesAsync();
                return MapPromoCode(existing);
            }

            var anyFeatured = existingList.Any(p => !p.IsDeleted && p.IsActive && p.IsFeaturedOnBanner);
            var entity = new PromoCode
            {
                Code = cleanCode,
                DiscountType = discountType,
                DiscountValue = Math.Max(0m, createDto.DiscountValue),
                MinOrderSubtotal = Math.Max(0m, createDto.MinOrderSubtotal),
                IsActive = true,
                IsFeaturedOnBanner = createDto.IsFeaturedOnBanner || !anyFeatured,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };

            await promoRepo.AddAsync(entity);
            await unitOfWork.SaveChangesAsync();
            return MapPromoCode(entity);
        }

        public async Task<PromoCodeDto> TogglePromoCodeAsync(int id)
        {
            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var entity = await promoRepo.GetByIdAsync(id)
                ?? throw new NotFoundCutomeException($"Promo code #{id} not found.");

            entity.IsActive = !entity.IsActive;
            if (!entity.IsActive)
            {
                entity.IsFeaturedOnBanner = false;
            }
            entity.UpdatedAt = DateTime.UtcNow;
            promoRepo.UpdateAsync(entity);
            await unitOfWork.SaveChangesAsync();
            return MapPromoCode(entity);
        }

        public async Task<PromoCodeDto> FeaturePromoCodeOnBannerAsync(int id)
        {
            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var all = await promoRepo.GetAllAsync();
            var target = all.FirstOrDefault(p => p.Id == id && !p.IsDeleted)
                ?? throw new NotFoundCutomeException($"Promo code #{id} not found.");

            var willFeature = !target.IsFeaturedOnBanner;
            foreach (var p in all.Where(x => !x.IsDeleted))
            {
                if (p.Id == target.Id)
                {
                    p.IsFeaturedOnBanner = willFeature;
                    if (willFeature)
                    {
                        p.IsActive = true;
                    }
                    p.UpdatedAt = DateTime.UtcNow;
                    promoRepo.UpdateAsync(p);
                }
                else if (willFeature && p.IsFeaturedOnBanner)
                {
                    p.IsFeaturedOnBanner = false;
                    p.UpdatedAt = DateTime.UtcNow;
                    promoRepo.UpdateAsync(p);
                }
            }

            await unitOfWork.SaveChangesAsync();
            return MapPromoCode(target);
        }

        public async Task<bool> DeletePromoCodeAsync(int id)
        {
            var promoRepo = unitOfWork.GetRepository<PromoCode, int>();
            var entity = await promoRepo.GetByIdAsync(id)
                ?? throw new NotFoundCutomeException($"Promo code #{id} not found.");

            promoRepo.DeleteAsync(entity);
            var saved = await unitOfWork.SaveChangesAsync();
            return saved > 0;
        }
    }
}
