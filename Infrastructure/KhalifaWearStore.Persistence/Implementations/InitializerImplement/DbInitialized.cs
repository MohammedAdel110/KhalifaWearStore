using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using KhalifaWearStore.Domain.DbInitializer;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;
using KhalifaWearStore.Persistence.Seeds;

namespace KhalifaWearStore.Persistence.Implementations.InitializerImplement
{
    public class DbInitialized(
        KhalifaDbContext projectDbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration) : IDbInitializer
    {
        public async Task DataSeedAsync()
        {
            var pendingMigrations = await projectDbContext.Database.GetPendingMigrationsAsync();
            if (pendingMigrations != null && pendingMigrations.Any())
            {
                await projectDbContext.Database.MigrateAsync();
            }

            await projectDbContext.Database.ExecuteSqlRawAsync(@"
                IF COL_LENGTH('Products', 'colorVariantsJson') IS NULL
                BEGIN
                    ALTER TABLE [Products] ADD [colorVariantsJson] nvarchar(max) NULL;
                END

                IF COL_LENGTH('Order', 'orderStatus') IS NULL
                BEGIN
                    ALTER TABLE [Order] ADD [orderStatus] nvarchar(40) NOT NULL CONSTRAINT DF_Order_OrderStatus DEFAULT 'Pending';
                END

                IF COL_LENGTH('Order', 'shippingFee') IS NULL
                BEGIN
                    ALTER TABLE [Order] ADD [shippingFee] decimal(18,2) NOT NULL CONSTRAINT DF_Order_ShippingFee DEFAULT 0;
                END

                IF COL_LENGTH('Order', 'discountAmount') IS NULL
                BEGIN
                    ALTER TABLE [Order] ADD [discountAmount] decimal(18,2) NOT NULL CONSTRAINT DF_Order_DiscountAmount DEFAULT 0;
                END

                IF COL_LENGTH('Order', 'promoCode') IS NULL
                BEGIN
                    ALTER TABLE [Order] ADD [promoCode] nvarchar(60) NULL;
                END

                IF OBJECT_ID('PromoCodes', 'U') IS NULL
                BEGIN
                    CREATE TABLE [PromoCodes] (
                        [promoCodeID] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [code] nvarchar(60) NOT NULL,
                        [discountType] nvarchar(40) NOT NULL DEFAULT 'Percentage',
                        [discountValue] decimal(18,2) NOT NULL DEFAULT 0,
                        [minOrderSubtotal] decimal(18,2) NOT NULL DEFAULT 0,
                        [isActive] bit NOT NULL DEFAULT 1,
                        [description] nvarchar(250) NOT NULL DEFAULT '',
                        [IsDeleted] bit NOT NULL DEFAULT 0,
                        [CreatedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        [UpdatedAt] datetime2 NULL,
                        [CreatedBy] nvarchar(max) NULL,
                        [UpdatedBy] nvarchar(max) NULL
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM [PromoCodes])
                BEGIN
                    INSERT INTO [PromoCodes] ([code], [discountType], [discountValue], [minOrderSubtotal], [isActive], [description], [IsDeleted], [CreatedAt])
                    VALUES
                        ('KHALIFA10', 'Percentage', 10, 0, 1, '10% OFF any order', 0, SYSUTCDATETIME()),
                        ('KHALIFA15', 'Percentage', 15, 3000, 1, '15% OFF orders >= 3,000 EGP', 0, SYSUTCDATETIME()),
                        ('DROP200', 'FixedAmount', 200, 2000, 1, '200 EGP OFF orders >= 2,000 EGP', 0, SYSUTCDATETIME()),
                        ('FREESHIP', 'FreeShipping', 0, 0, 1, 'Free Express Delivery to any governorate', 0, SYSUTCDATETIME());
                END
            ");

            await SeederAsync.SeedRolesAsync(roleManager);
            await SeederAsync.SeedOwnerUserAsync(userManager);
            await SeederAsync.SeedAdminUserAsync(userManager);

            var enableDemoData = configuration.GetValue<bool>("Seeding:EnableDemoData", true);
            if (enableDemoData)
            {
                await SeederAsync.SeedDummyCustomersAsync(userManager);
                await SeederAsync.SeedStoreDataAsync(projectDbContext);
            }
        }
    }
}
