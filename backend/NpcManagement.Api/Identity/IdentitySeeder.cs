using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NpcManagement.Api.Controllers;
using NpcManagement.Infrastructure.Identity;

namespace NpcManagement.Api.Identity;

// Applies the Identity EF migrations, ensures the Admin role exists, and — if a
// "Seed:Admin*" configuration is supplied — bootstraps an initial admin user so
// the protected /api/users endpoints can be reached on a fresh database.
public static class IdentitySeeder
{
    public static async Task MigrateAndSeedAsync(IServiceProvider services, IConfiguration configuration)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;

        await provider.GetRequiredService<AppDbContext>().Database.MigrateAsync();

        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        if (!await roleManager.RoleExistsAsync(UsersController.AdminRole))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(UsersController.AdminRole));
        }

        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var userManager = provider.GetRequiredService<UserManager<AppUser>>();
        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var admin = new AppUser
        {
            Email = email,
            UserName = configuration["Seed:AdminUserName"] ?? email,
        };
        var created = await userManager.CreateAsync(admin, password);
        if (created.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, UsersController.AdminRole);
        }
    }
}
