using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NpcManagement.Api.Identity;
using NpcManagement.Api.Services;
using NpcManagement.Domain.Repositories;
using NpcManagement.Domain.Services;
using NpcManagement.Infrastructure.Identity;
using NpcManagement.Infrastructure.Repositories;
using NpcManagement.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Missing connection string 'Postgres'.");
builder.Services.AddNpgsqlDataSource(connectionString);

builder.Services.AddSingleton<INpcRepository, PostgresNpcRepository>();
builder.Services.AddSingleton<ILocationRepository, PostgresLocationRepository>();

// ASP.NET Identity, backed by EF Core in its own "users" schema. The Identity
// tables are managed by EF migrations, separate from the hand-written "npc"
// schema; the migrations history table also lives in the users schema.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", AppDbContext.Schema)));

builder.Services.AddIdentityCore<AppUser>(options =>
    {
        // Accounts are username-only — no email is collected, so don't require one.
        options.User.RequireUniqueEmail = false;
        // Only require a minimum length — no character-class requirements.
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT bearer authentication. The signing key and issuer/audience come from the
// "Jwt" configuration section (see appsettings); the key has no default.
var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
builder.Services.Configure<JwtOptions>(jwtSection);
var jwtOptions = jwtSection.Get<JwtOptions>()
    ?? throw new InvalidOperationException("Missing 'Jwt' configuration section.");
if (string.IsNullOrWhiteSpace(jwtOptions.Key))
{
    throw new InvalidOperationException("Missing 'Jwt:Key' configuration value.");
}

builder.Services.AddSingleton<ITokenService, JwtTokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
        };
    });

builder.Services.AddAuthorization();

// Stable Diffusion Forge portrait generation. The Forge base URL is supplied
// per request from the user's Settings; generation can take up to ~2 min on a
// cold first request, so the timeout is generous.
builder.Services.AddSingleton(new ForgeOptions
{
    Model = builder.Configuration["Forge:Model"],
    Vae = builder.Configuration["Forge:Vae"],
});
builder.Services.AddHttpClient<IPortraitGenerator, ForgePortraitGenerator>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(120);
});

var app = builder.Build();

// Apply Identity migrations and seed the Admin role (and optional admin user).
await IdentitySeeder.MigrateAndSeedAsync(app.Services, app.Configuration);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
