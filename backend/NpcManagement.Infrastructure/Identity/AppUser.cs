using Microsoft.AspNetCore.Identity;

namespace NpcManagement.Infrastructure.Identity;

// Application user backing ASP.NET Identity. Guid keys match the project's
// convention — NPCs and locations all use uuid primary keys — so users line up
// with the rest of the schema. Extra profile fields can hang off here later.
public class AppUser : IdentityUser<Guid>
{
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
