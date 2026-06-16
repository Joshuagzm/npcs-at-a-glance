using NpcManagement.Domain.Repositories;
using NpcManagement.Domain.Services;
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
builder.Services.AddSingleton<ILocationRepository, InMemoryLocationRepository>();

// Stable Diffusion Forge portrait generation. The base URL points at the local
// Forge install (launched with --api); generation can take up to ~2 min on a
// cold first request, so the timeout is generous.
var forgeBaseUrl = builder.Configuration["Forge:BaseUrl"] ?? "http://127.0.0.1:7860";
builder.Services.AddSingleton(new ForgeOptions
{
    Model = builder.Configuration["Forge:Model"],
    Vae = builder.Configuration["Forge:Vae"],
});
builder.Services.AddHttpClient<IPortraitGenerator, ForgePortraitGenerator>(client =>
{
    client.BaseAddress = new Uri(forgeBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(120);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
