using Microsoft.AspNetCore.Identity;
using KhalifaWearStore.Domain.Contracts;
using KhalifaWearStore.Shared.EnumHelper.UserEnums;

namespace KhalifaWearStore.Domain.Models.User
{
    public class ApplicationUser : IdentityUser, IEntity<string>
    {
        public string FullName { get; set; } = string.Empty;
        public UserRole Role { get; set; }

        public virtual Customer? CustomerProfile { get; set; }
    }
}
