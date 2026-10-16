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

            // 3. Seed Products & Stock Variants
            if (!await context.Products.AnyAsync())
            {
                var mensCategory = await context.Categories.FirstAsync(c => c.CategoryName == "Men's Wear");
                var womensCategory = await context.Categories.FirstAsync(c => c.CategoryName == "Women's Wear");
                var accessoriesCategory = await context.Categories.FirstAsync(c => c.CategoryName == "Footwear & Accessories");

                var products = new List<Product>
                {
                    new()
                    {
                        ProductName = "Classic Oxford Cotton Shirt",
                        ProductDescription = "Breathable 100% cotton tailored fit shirt suitable for formal and smart-casual occasions.",
                        CategoryId = mensCategory.Id,
                        UnitPrice = 850.00m,
                        Colour = "Navy Blue",
                        Size = "L",
                        ProductAvailable = true,
                        Image = "Images/Products/oxford-shirt-navy.jpg",
                        Stocks = new List<Stock>
                        {
                            new() { Size = "M", Colour = "Navy Blue", QuantityInStock = 25 },
                            new() { Size = "L", Colour = "Navy Blue", QuantityInStock = 40 },
                            new() { Size = "XL", Colour = "White", QuantityInStock = 18 }
                        }
                    },
                    new()
                    {
                        ProductName = "Slim Fit Chino Trousers",
                        ProductDescription = "Stretch cotton-twill chino trousers with a modern tapered leg.",
                        CategoryId = mensCategory.Id,
                        UnitPrice = 1100.00m,
                        Colour = "Beige",
                        Size = "32",
                        ProductAvailable = true,
                        Image = "Images/Products/slim-chino-beige.jpg",
                        Stocks = new List<Stock>
                        {
                            new() { Size = "30", Colour = "Beige", QuantityInStock = 15 },
                            new() { Size = "32", Colour = "Beige", QuantityInStock = 30 },
                            new() { Size = "34", Colour = "Olive", QuantityInStock = 20 }
                        }
                    },
                    new()
                    {
                        ProductName = "Embroidered Linen Abaya",
                        ProductDescription = "Lightweight premium linen abaya featuring handcrafted sleeve embroidery.",
                        CategoryId = womensCategory.Id,
                        UnitPrice = 2400.00m,
                        Colour = "Black",
                        Size = "M",
                        ProductAvailable = true,
                        Image = "Images/Products/linen-abaya-black.jpg",
                        Stocks = new List<Stock>
                        {
                            new() { Size = "S", Colour = "Black", QuantityInStock = 12 },
                            new() { Size = "M", Colour = "Black", QuantityInStock = 22 },
                            new() { Size = "L", Colour = "Emerald", QuantityInStock = 10 }
                        }
                    },
                    new()
                    {
                        ProductName = "Pleated Satin Midi Dress",
                        ProductDescription = "Elegant pleated midi dress with adjustable waist belt.",
                        CategoryId = womensCategory.Id,
                        UnitPrice = 1750.00m,
                        Colour = "Burgundy",
                        Size = "S",
                        ProductAvailable = true,
                        Image = "Images/Products/satin-dress-burgundy.jpg",
                        Stocks = new List<Stock>
                        {
                            new() { Size = "S", Colour = "Burgundy", QuantityInStock = 14 },
                            new() { Size = "M", Colour = "Burgundy", QuantityInStock = 19 }
                        }
                    },
                    new()
                    {
                        ProductName = "Handcrafted Leather Loafers",
                        ProductDescription = "Full-grain calfskin leather loafers with cushioned insole.",
                        CategoryId = accessoriesCategory.Id,
                        UnitPrice = 1950.00m,
                        Colour = "Dark Brown",
                        Size = "42",
                        ProductAvailable = true,
                        Image = "Images/Products/leather-loafers-brown.jpg",
                        Stocks = new List<Stock>
                        {
                            new() { Size = "41", Colour = "Dark Brown", QuantityInStock = 10 },
                            new() { Size = "42", Colour = "Dark Brown", QuantityInStock = 16 },
                            new() { Size = "43", Colour = "Black", QuantityInStock = 12 }
                        }
                    }
                };

                await context.Products.AddRangeAsync(products);
                await context.SaveChangesAsync();
            }

            // 4. Seed Demo Orders & OrderDetails
            if (!await context.Orders.AnyAsync())
            {
                var omar = await context.Customers.FirstOrDefaultAsync(c => c.Email == "omar.customer@khalifawear.com");
                var sara = await context.Customers.FirstOrDefaultAsync(c => c.Email == "sara.customer@khalifawear.com");

                var codPayment = await context.Payments.FirstOrDefaultAsync(p => p.PaymentType == PaymentType.CashOnDelivery);
                var cardPayment = await context.Payments.FirstOrDefaultAsync(p => p.PaymentType == PaymentType.CreditCard);

                var shirt = await context.Products.FirstOrDefaultAsync(p => p.ProductName == "Classic Oxford Cotton Shirt");
                var chinos = await context.Products.FirstOrDefaultAsync(p => p.ProductName == "Slim Fit Chino Trousers");
                var abaya = await context.Products.FirstOrDefaultAsync(p => p.ProductName == "Embroidered Linen Abaya");
                var loafers = await context.Products.FirstOrDefaultAsync(p => p.ProductName == "Handcrafted Leather Loafers");

                if (omar != null && sara != null && codPayment != null && cardPayment != null &&
                    shirt != null && chinos != null && abaya != null && loafers != null)
                {
                    var demoOrders = new List<Order>
                    {
                        new()
                        {
                            CustomerId = omar.Id,
                            PaymentId = cardPayment.Id,
                            OrderDate = DateTime.UtcNow.AddDays(-3),
                            Paid = true,
                            PaymentDate = DateTime.UtcNow.AddDays(-3),
                            CreatedBy = omar.ApplicationUserId,
                            OrderDetails = new List<OrderDetail>
                            {
                                new()
                                {
                                    ProductId = shirt.Id,
                                    Size = "L",
                                    Colour = "Navy Blue",
                                    Quantity = 2,
                                    UnitPrice = shirt.UnitPrice,
                                    Total = shirt.UnitPrice * 2
                                },
                                new()
                                {
                                    ProductId = chinos.Id,
                                    Size = "32",
                                    Colour = "Beige",
                                    Quantity = 1,
                                    UnitPrice = chinos.UnitPrice,
                                    Total = chinos.UnitPrice
                                }
                            }
                        },
                        new()
                        {
                            CustomerId = sara.Id,
                            PaymentId = codPayment.Id,
                            OrderDate = DateTime.UtcNow.AddDays(-1),
                            Paid = false,
                            PaymentDate = null,
                            CreatedBy = sara.ApplicationUserId,
                            OrderDetails = new List<OrderDetail>
                            {
                                new()
                                {
                                    ProductId = abaya.Id,
                                    Size = "M",
                                    Colour = "Black",
                                    Quantity = 1,
                                    UnitPrice = abaya.UnitPrice,
                                    Total = abaya.UnitPrice
                                }
                            }
                        },
                        new()
                        {
                            CustomerId = omar.Id,
                            PaymentId = cardPayment.Id,
                            OrderDate = DateTime.UtcNow.AddHours(-5),
                            Paid = true,
                            PaymentDate = DateTime.UtcNow.AddHours(-5),
                            CreatedBy = omar.ApplicationUserId,
                            OrderDetails = new List<OrderDetail>
                            {
                                new()
                                {
                                    ProductId = loafers.Id,
                                    Size = "42",
                                    Colour = "Dark Brown",
                                    Quantity = 1,
                                    UnitPrice = loafers.UnitPrice,
                                    Total = loafers.UnitPrice
                                }
                            }
                        }
                    };

                    await context.Orders.AddRangeAsync(demoOrders);
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
