using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Contracts.SpecificationPattern.BaseSpec;
using KhalifaWearStore.Shared.Common.Params.Customer;
using CustomerEntity = KhalifaWearStore.Domain.Models.User.Customer;

namespace KhalifaWearStore.Services.Specifications.CustomerSpec
{
    public class CustomerWithFiltersSpec : BaseSpecifications<CustomerEntity, int>
    {
        public CustomerWithFiltersSpec(CustomerQueryParams queryParams, bool isCountSpec = false)
            : base(c =>
                !c.IsDeleted &&
                (string.IsNullOrEmpty(queryParams.City) || EF.Functions.Like(c.City, $"%{queryParams.City}%")) &&
                (string.IsNullOrEmpty(queryParams.Search) ||
                 EF.Functions.Like(c.FirstName, $"%{queryParams.Search}%") ||
                 EF.Functions.Like(c.LastName, $"%{queryParams.Search}%") ||
                 EF.Functions.Like(c.Email, $"%{queryParams.Search}%") ||
                 EF.Functions.Like(c.PhoneNo, $"%{queryParams.Search}%")))
        {
            if (!isCountSpec)
            {
                AddOrderBy(c => c.CreatedAt, isDescending: true);
                ApplyPaging(queryParams.PageSize, queryParams.PageIndex);
            }
        }
    }

    public class CustomerByAppUserIdSpec : BaseSpecifications<CustomerEntity, int>
    {
        public CustomerByAppUserIdSpec(string applicationUserId)
            : base(c => c.ApplicationUserId == applicationUserId && !c.IsDeleted)
        {
            AddInclude(c => c.Orders);
            AddInclude("Orders.Payment");
            AddInclude("Orders.OrderDetails");
        }
    }

    public class CustomerByIdWithOrdersSpec : BaseSpecifications<CustomerEntity, int>
    {
        public CustomerByIdWithOrdersSpec(int customerId)
            : base(c => c.Id == customerId && !c.IsDeleted)
        {
            AddInclude(c => c.Orders);
            AddInclude("Orders.Payment");
            AddInclude("Orders.OrderDetails");
        }
    }
}
