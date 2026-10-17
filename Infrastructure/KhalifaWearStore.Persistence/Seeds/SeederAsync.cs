using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Domain.Models.Orders;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;
using KhalifaWearStore.Shared.EnumHelper.PaymentEnums;
using KhalifaWearStore.Shared.EnumHelper.UserEnums;

namespace KhalifaWearStore.Persistence.Seeds
{
    public static class SeederAsync
    {
        public static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            foreach (var role in Enum.GetNames(typeof(UserRole)))
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        public static async Task SeedOwnerUserAsync(UserManager<ApplicationUser> userManager)
        {
            const string ownerEmail = "121mohamedadel121@gmail.com";
            const string ownerPassword = "Dr7kaf7elkbeer@";
            var ownerUser = await userManager.FindByEmailAsync(ownerEmail);

            if (ownerUser == null)
            {
                ownerUser = new ApplicationUser
                {
                    UserName = ownerEmail.ToUpperInvariant(),
                    Email = ownerEmail,
                    FullName = "Mohamed Adel",
                    Role = UserRole.Owner,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(ownerUser, ownerPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(ownerUser, UserRole.Owner.ToString());
                    await userManager.AddToRoleAsync(ownerUser, UserRole.Admin.ToString());
                }
            }
            else
            {
                ownerUser.Role = UserRole.Owner;
                ownerUser.EmailConfirmed = true;
                await userManager.UpdateAsync(ownerUser);

                if (!await userManager.IsInRoleAsync(ownerUser, UserRole.Owner.ToString()))
                {
                    await userManager.AddToRoleAsync(ownerUser, UserRole.Owner.ToString());
                }
                if (!await userManager.IsInRoleAsync(ownerUser, UserRole.Admin.ToString()))
                {
                    await userManager.AddToRoleAsync(ownerUser, UserRole.Admin.ToString());
                }
                if (!await userManager.CheckPasswordAsync(ownerUser, ownerPassword))
                {
                    var resetToken = await userManager.GeneratePasswordResetTokenAsync(ownerUser);
                    await userManager.ResetPasswordAsync(ownerUser, resetToken, ownerPassword);
                }
            }
        }

        public static async Task SeedAdminUserAsync(UserManager<ApplicationUser> userManager)
        {
            const string adminEmail = "admin@khalifawear.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                var newAdmin = new ApplicationUser
                {
                    UserName = adminEmail.ToUpperInvariant(),
                    Email = adminEmail,
                    FullName = "Khalifa Wear Admin",
                    Role = UserRole.Admin,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(newAdmin, "Admin@123456");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(newAdmin, UserRole.Admin.ToString());
                }
            }
        }

        public static async Task SeedDummyCustomersAsync(UserManager<ApplicationUser> userManager)
        {
            var demoCustomers = new List<(string FirstName, string LastName, string Email, string City, string Postcode, string PhoneNo)>
            {
                ("Omar", "Khalifa", "omar.customer@khalifawear.com", "Cairo", "11511", "01012345671"),
                ("Sara", "Hassan", "sara.customer@khalifawear.com", "Alexandria", "21500", "01012345672"),
                ("Karim", "Adel", "karim.customer@khalifawear.com", "Giza", "12511", "01012345673")
            };

            foreach (var item in demoCustomers)
            {
                if (await userManager.FindByEmailAsync(item.Email) == null)
                {
                    var appUser = new ApplicationUser
                    {
                        UserName = item.Email.ToUpperInvariant(),
                        Email = item.Email,
                        FullName = $"{item.FirstName} {item.LastName}",
                        PhoneNumber = item.PhoneNo,
                        Role = UserRole.Customer,
                        EmailConfirmed = true,
                        CustomerProfile = new Customer
                        {
                            FirstName = item.FirstName,
                            LastName = item.LastName,
                            Email = item.Email,
                            City = item.City,
                            Postcode = item.Postcode,
                            PhoneNo = item.PhoneNo
                        }
                    };

                    var result = await userManager.CreateAsync(appUser, "Password@123");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(appUser, UserRole.Customer.ToString());
                    }
                }
            }
        }

        public static async Task SeedStoreDataAsync(KhalifaDbContext context)
        {
            // 1. Seed Payments
            if (!await context.Payments.AnyAsync())
            {
                var payments = Enum.GetValues<PaymentType>()
                    .Select(pt => new Payment { PaymentType = pt })
                    .ToList();

                await context.Payments.AddRangeAsync(payments);
                await context.SaveChangesAsync();
            }

            // 2. Seed Categories
            if (!await context.Categories.AnyAsync())
            {
                var categories = new List<Category>
                {
                    new() { CategoryName = "Men's Wear", CategoryDescription = "Shirts, trousers, jackets, and traditional wear for men." },
                    new() { CategoryName = "Women's Wear", CategoryDescription = "Dresses, abayas, tops, and contemporary wear for women." },
                    new() { CategoryName = "Footwear & Accessories", CategoryDescription = "Shoes, belts, bags, and seasonal accessories." }
                };

                await context.Categories.AddRangeAsync(categories);
                await context.SaveChangesAsync();
            }

            // Products, stock variants and demo orders are intentionally NOT seeded.
            // The catalog is managed via the Admin Portal / real product data only.
        }
    }
}
