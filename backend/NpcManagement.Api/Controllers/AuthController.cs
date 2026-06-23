using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NpcManagement.Api.Contracts;
using NpcManagement.Api.Services;
using NpcManagement.Infrastructure.Identity;

namespace NpcManagement.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly ITokenService _tokenService;

    public AuthController(UserManager<AppUser> userManager, ITokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            Email = request.Email,
            UserName = request.UserName,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return IdentityValidationProblem(result);
        }

        return await BuildAuthResponse(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            // Same response whether the email is unknown or the password is wrong.
            return Unauthorized(new { error = "Invalid email or password." });
        }

        return await BuildAuthResponse(user);
    }

    private async Task<ActionResult<AuthResponse>> BuildAuthResponse(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.CreateToken(user, roles);
        var response = new UserResponse(user.Id, user.Email, user.UserName, [.. roles], user.CreatedAt);
        return Ok(new AuthResponse(token.Token, token.ExpiresAt, response));
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
