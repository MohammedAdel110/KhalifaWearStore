using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using KhalifaWearStore.Shared.Common.Params.Order;
using OrderEntity = KhalifaWearStore.Domain.Models.Orders.Order;

namespace KhalifaWearStore.Services.Specifications.OrderSpec
{
    public class OrdersWithFiltersSpec : BaseSpecifications<OrderEntity, int>
    {
        public OrdersWithFiltersSpec(OrderQueryParams queryParams, bool isCountSpec = false)
            : base(o =>
                !o.IsDeleted &&
                (!queryParams.CustomerId.HasValue || o.CustomerId == queryParams.CustomerId.Value) &&
                (!queryParams.PaymentId.HasValue || o.PaymentId == queryParams.PaymentId.Value) &&
                (!queryParams.Paid.HasValue || o.Paid == queryParams.Paid.Value) &&
                (!queryParams.FromDate.HasValue || o.OrderDate >= queryParams.FromDate.Value) &&
                (!queryParams.ToDate.HasValue || o.OrderDate <= queryParams.ToDate.Value) &&
                (string.IsNullOrEmpty(queryParams.Search) ||
                 EF.Functions.Like(o.Customer.FirstName, $"%{queryParams.Search}%") ||
                 EF.Functions.Like(o.Customer.LastName, $"%{queryParams.Search}%") ||
                 EF.Functions.Like(o.Customer.Email, $"%{queryParams.Search}%")))
        {
            if (!isCountSpec)
            {
                AddInclude(o => o.Customer);
                AddInclude(o => o.Payment);
                AddInclude(o => o.OrderDetails);
                AddOrderBy(o => o.OrderDate, isDescending: true);
                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }

    public class CustomerOrdersSpec : BaseSpecifications<OrderEntity, int>
    {
        public CustomerOrdersSpec(int customerId, OrderQueryParams queryParams, bool isCountSpec = false)
            : base(o =>
                !o.IsDeleted &&
                o.CustomerId == customerId &&
                (!queryParams.Paid.HasValue || o.Paid == queryParams.Paid.Value) &&
                (!queryParams.FromDate.HasValue || o.OrderDate >= queryParams.FromDate.Value) &&
                (!queryParams.ToDate.HasValue || o.OrderDate <= queryParams.ToDate.Value))
        {
            if (!isCountSpec)
            {
                AddInclude(o => o.Customer);
                AddInclude(o => o.Payment);
                AddInclude(o => o.OrderDetails);
                AddOrderBy(o => o.OrderDate, isDescending: true);
                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }

    public class OrderByIdWithDetailsSpec : BaseSpecifications<OrderEntity, int>
    {
        public OrderByIdWithDetailsSpec(int orderId)
            : base(o => o.Id == orderId && !o.IsDeleted)
        {
            AddInclude(o => o.Customer);
            AddInclude(o => o.Payment);
            AddInclude(o => o.OrderDetails);
            AddInclude("OrderDetails.Product");
        }
    }
}
