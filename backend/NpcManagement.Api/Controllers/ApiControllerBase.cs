using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace NpcManagement.Api.Controllers;

// Base for controllers whose resources are owned by the authenticated user.
public abstract class ApiControllerBase : ControllerBase
{
    // The authenticated user's id, read from the JWT. These controllers are
    // [Authorize]d, so the claim is always present.
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
