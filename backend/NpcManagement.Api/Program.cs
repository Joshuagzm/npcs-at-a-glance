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
builder.Services.AddSingleton<ILocationRepository, PostgresLocationRepository>();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
