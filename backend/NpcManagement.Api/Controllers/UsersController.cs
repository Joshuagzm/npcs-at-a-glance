using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NpcManagement.Api.Contracts;
using NpcManagement.Infrastructure.Identity;

namespace NpcManagement.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    // Role required to mutate or delete other users.
    public const string AdminRole = "Admin";

    private readonly UserManager<AppUser> _userManager;

    public UsersController(UserManager<AppUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll()
    {
        var users = _userManager.Users.OrderBy(u => u.CreatedAt).ToList();

        var responses = new List<UserResponse>(users.Count);
        foreach (var user in users)
        {
            responses.Add(await ToResponse(user));
        }

        return Ok(responses);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> GetById(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        return user is null ? NotFound() : Ok(await ToResponse(user));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AdminRole)]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        user.Email = request.Email;
        user.UserName = request.UserName;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return IdentityValidationProblem(updateResult);
        }

        if (request.Roles is not null)
        {
            var syncResult = await SyncRoles(user, request.Roles);
            if (syncResult is not null)
            {
                return syncResult;
            }
        }

        return Ok(await ToResponse(user));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AdminRole)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var result = await _userManager.DeleteAsync(user);
        return result.Succeeded ? NoContent() : IdentityValidationProblem(result);
    }

    // Reconcile the user's role set to exactly the requested list.
    private async Task<ActionResult?> SyncRoles(AppUser user, IReadOnlyList<string> requested)
    {
        var current = await _userManager.GetRolesAsync(user);
        var toAdd = requested.Except(current, StringComparer.OrdinalIgnoreCase).ToList();
        var toRemove = current.Except(requested, StringComparer.OrdinalIgnoreCase).ToList();

        if (toRemove.Count > 0)
        {
            var removed = await _userManager.RemoveFromRolesAsync(user, toRemove);
            if (!removed.Succeeded)
            {
                return IdentityValidationProblem(removed);
            }
        }

        if (toAdd.Count > 0)
        {
            var added = await _userManager.AddToRolesAsync(user, toAdd);
            if (!added.Succeeded)
            {
                return IdentityValidationProblem(added);
            }
        }

        return null;
    }

    private async Task<UserResponse> ToResponse(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        return new UserResponse(user.Id, user.Email, user.UserName, [.. roles], user.CreatedAt);
    }

    private ActionResult IdentityValidationProblem(IdentityResult result)
    {
        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(error.Code, error.Description);
        }

        return ValidationProblem(ModelState);
    }
}
