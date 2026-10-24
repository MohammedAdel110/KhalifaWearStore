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
                IF COL_LENGTH('Category', 'image') IS NULL
                BEGIN
                    ALTER TABLE [Category] ADD [image] nvarchar(max) NULL;
                END

                IF OBJECT_ID('StoredMedia', 'U') IS NULL
                BEGIN
                    CREATE TABLE [StoredMedia] (
                        [mediaID] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [relativePath] nvarchar(260) NOT NULL,
                        [contentType] nvarchar(80) NOT NULL DEFAULT 'image/jpeg',
                        [fileBytes] varbinary(max) NOT NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0,
                        [CreatedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        [UpdatedAt] datetime2 NULL,
                        [CreatedBy] nvarchar(max) NULL,
                        [UpdatedBy] nvarchar(max) NULL
                    );

                    CREATE UNIQUE NONCLUSTERED INDEX [UX_StoredMedia_RelativePath]
                    ON [StoredMedia]([relativePath]);
                END

                IF OBJECT_ID('SupportChatThreads', 'U') IS NULL
                BEGIN
                    CREATE TABLE [SupportChatThreads] (
                        [ThreadId] nvarchar(128) NOT NULL PRIMARY KEY,
                        [CustomerName] nvarchar(150) NOT NULL,
                        [CustomerEmail] nvarchar(256) NULL,
                        [LastMessageText] nvarchar(max) NOT NULL,
                        [LastMessageAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        [PayloadJson] nvarchar(max) NOT NULL
                    );
                END

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
                        [isFeaturedOnBanner] bit NOT NULL DEFAULT 0,
                        [description] nvarchar(250) NOT NULL DEFAULT '',
                        [IsDeleted] bit NOT NULL DEFAULT 0,
                        [CreatedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        [UpdatedAt] datetime2 NULL,
                        [CreatedBy] nvarchar(max) NULL,
                        [UpdatedBy] nvarchar(max) NULL
                    );

                    EXEC('INSERT INTO [PromoCodes] ([code], [discountType], [discountValue], [minOrderSubtotal], [isActive], [isFeaturedOnBanner], [description], [IsDeleted], [CreatedAt])
                    VALUES
                        (''KHALIFA15'', ''Percentage'', 15, 3000, 1, 1, ''15% OFF orders >= 3,000 EGP'', 0, SYSUTCDATETIME()),
                        (''DROP200'', ''FixedAmount'', 200, 2000, 1, 0, ''200 EGP OFF orders >= 2,000 EGP'', 0, SYSUTCDATETIME()),
                        (''FREESHIP'', ''FreeShipping'', 0, 0, 1, 0, ''Free Express Delivery to any governorate'', 0, SYSUTCDATETIME())');
                END

                IF COL_LENGTH('PromoCodes', 'isFeaturedOnBanner') IS NULL
                BEGIN
                    EXEC('ALTER TABLE [PromoCodes] ADD [isFeaturedOnBanner] bit NOT NULL CONSTRAINT DF_PromoCodes_IsFeaturedOnBanner DEFAULT 0');
                    EXEC('UPDATE TOP(1) [PromoCodes] SET [isFeaturedOnBanner] = 1 WHERE [isActive] = 1 AND [IsDeleted] = 0');
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ApplicationUsers_Email_Unique' AND object_id = OBJECT_ID('ApplicationUsers'))
                BEGIN
                    ALTER TABLE [ApplicationUsers] ALTER COLUMN [Email] nvarchar(256) NULL;

                    CREATE UNIQUE NONCLUSTERED INDEX [UX_ApplicationUsers_Email_Unique]
                    ON [ApplicationUsers]([Email])
                    WHERE [Email] IS NOT NULL AND [Email] <> '';
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ApplicationUsers_PhoneNumber_Unique' AND object_id = OBJECT_ID('ApplicationUsers'))
                BEGIN
                    ALTER TABLE [ApplicationUsers] ALTER COLUMN [PhoneNumber] nvarchar(30) NULL;

                    ;WITH DupAppPhones AS (
                        SELECT [Id], ROW_NUMBER() OVER (PARTITION BY [PhoneNumber] ORDER BY [Id]) AS rn
                        FROM [ApplicationUsers]
                        WHERE [PhoneNumber] IS NOT NULL AND [PhoneNumber] <> ''
                    )
                    UPDATE u SET u.[PhoneNumber] = NULL
                    FROM [ApplicationUsers] u
                    INNER JOIN DupAppPhones d ON u.[Id] = d.[Id]
                    WHERE d.rn > 1;

                    CREATE UNIQUE NONCLUSTERED INDEX [UX_ApplicationUsers_PhoneNumber_Unique]
                    ON [ApplicationUsers]([PhoneNumber])
                    WHERE [PhoneNumber] IS NOT NULL AND [PhoneNumber] <> '';
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Customers_PhoneNo_Unique' AND object_id = OBJECT_ID('Customers'))
                BEGIN
                    ;WITH DupCustPhones AS (
                        SELECT [customerID], ROW_NUMBER() OVER (PARTITION BY [phoneNo] ORDER BY [customerID]) AS rn
                        FROM [Customers]
                        WHERE [phoneNo] IS NOT NULL AND [phoneNo] <> '' AND [phoneNo] <> '0000000000'
                    )
                    UPDATE c SET c.[phoneNo] = '0000000000'
                    FROM [Customers] c
                    INNER JOIN DupCustPhones d ON c.[customerID] = d.[customerID]
                    WHERE d.rn > 1;

                    CREATE UNIQUE NONCLUSTERED INDEX [UX_Customers_PhoneNo_Unique]
                    ON [Customers]([phoneNo])
                    WHERE [phoneNo] IS NOT NULL AND [phoneNo] <> '' AND [phoneNo] <> '0000000000';
                END
            ");

            await SeederAsync.SeedRolesAsync(roleManager);
            await SeederAsync.SeedOwnerUserAsync(userManager);
            await SeederAsync.SeedAdminUserAsync(userManager);

            // Sync any existing wwwroot/Images files into StoredMedia table in the database
            try
            {
                var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var imagesRoot = Path.Combine(webRoot, "Images");
                if (Directory.Exists(imagesRoot))
                {
                    var existingPaths = await projectDbContext.StoredMedia
                        .Select(m => m.RelativePath)
                        .ToListAsync();
                    var existingSet = new HashSet<string>(existingPaths, StringComparer.OrdinalIgnoreCase);

                    foreach (var file in Directory.GetFiles(imagesRoot, "*.*", SearchOption.AllDirectories))
                    {
                        var rel = Path.GetRelativePath(webRoot, file).Replace("\\", "/").TrimStart('/');
                        if (existingSet.Contains(rel))
                            continue;

                        var ext = Path.GetExtension(file).ToLowerInvariant();
                        var contentType = ext switch
                        {
                            ".png" => "image/png",
                            ".webp" => "image/webp",
                            ".jpg" or ".jpeg" => "image/jpeg",
                            _ => "application/octet-stream"
                        };

                        var bytes = await File.ReadAllBytesAsync(file);
                        projectDbContext.StoredMedia.Add(new KhalifaWearStore.Domain.Models.Catalog.StoredMedia
                        {
                            RelativePath = rel,
                            ContentType = contentType,
                            FileBytes = bytes,
                            CreatedAt = DateTime.UtcNow
                        });
                        existingSet.Add(rel);
                    }

                    await projectDbContext.SaveChangesAsync();
                }
            }
            catch
            {
                // Ignore non-fatal media sync errors on startup
            }

            var enableDemoData = configuration.GetValue<bool>("Seeding:EnableDemoData", true);
            if (enableDemoData)
            {
                await SeederAsync.SeedDummyCustomersAsync(userManager);
                await SeederAsync.SeedStoreDataAsync(projectDbContext);
            }
        }
    }
}
