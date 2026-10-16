using AutoMapper;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Domain.Models.Orders;
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
    public class OrderService(IUnitOfWork unitOfWork, IMapper mapper) : IOrderService
    {
        private async Task<CustomerEntity> GetValidCustomerAsync(string applicationUserId)
        {
            var customerRepo = unitOfWork.GetRepository<CustomerEntity, int>();
            var spec = new CustomerByAppUserIdSpec(applicationUserId);
            var customer = await customerRepo.GetByIdWithSpecAsync(spec)
                ?? throw new BadRequestCustomeException("Customer profile not found for this user.");

            return customer;
        }

        public async Task<OrderDetailsDto> CreateOrderAsync(CreateOrderDto createDto, string applicationUserId)
        {
            var customer = await GetValidCustomerAsync(applicationUserId);

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
                var product = await productRepo.GetByIdAsync(item.ProductId);
                if (product == null || product.IsDeleted || !product.ProductAvailable)
                    throw new BadRequestCustomeException($"Product with ID {item.ProductId} is not available.");

                var stockSpec = new StockByProductVariantSpec(item.ProductId, item.Size, item.Colour);
                var stockVariant = await stockRepo.GetByIdWithSpecAsync(stockSpec);
                if (stockVariant != null)
                {
                    if (stockVariant.QuantityInStock < item.Quantity)
                        throw new BadRequestCustomeException($"Insufficient stock for '{product.ProductName}' ({item.Size} / {item.Colour}). Available: {stockVariant.QuantityInStock}.");

                    stockVariant.QuantityInStock -= item.Quantity;
                    stockVariant.UpdatedAt = DateTime.UtcNow;
                    stockRepo.UpdateAsync(stockVariant);
                }

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    Size = item.Size,
                    Colour = item.Colour,
                    Quantity = item.Quantity,
                    UnitPrice = product.UnitPrice,
                    Total = product.UnitPrice * item.Quantity
                });
            }

            var order = new OrderEntity
            {
                CustomerId = customer.Id,
                PaymentId = payment.Id,
                OrderDate = DateTime.UtcNow,
                Paid = createDto.Paid,
                PaymentDate = createDto.Paid ? DateTime.UtcNow : null,
                CreatedBy = applicationUserId,
                OrderDetails = orderDetails
            };

            var orderRepo = unitOfWork.GetRepository<OrderEntity, int>();
            await orderRepo.AddAsync(order);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create order.");

            return await GetAdminOrderDetailsAsync(order.Id);
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
            order.UpdatedAt = DateTime.UtcNow;

            orderRepo.UpdateAsync(order);
            await unitOfWork.SaveChangesAsync();

            return mapper.Map<OrderDetailsDto>(order);
        }
    }
}
