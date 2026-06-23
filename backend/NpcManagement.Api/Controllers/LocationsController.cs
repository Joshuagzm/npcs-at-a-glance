using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NpcManagement.Api.Contracts;
using NpcManagement.Domain.Entities;
using NpcManagement.Domain.Repositories;

namespace NpcManagement.Api.Controllers;

[ApiController]
[Route("api/locations")]
[Authorize]
public class LocationsController : ControllerBase
{
    private readonly ILocationRepository _locationRepository;

    public LocationsController(ILocationRepository locationRepository)
    {
        _locationRepository = locationRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Location>>> GetAll(CancellationToken cancellationToken)
    {
        var locations = await _locationRepository.GetAllAsync(cancellationToken);
        return Ok(locations);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Location>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var location = await _locationRepository.GetByIdAsync(id, cancellationToken);
        return location is null ? NotFound() : Ok(location);
    }

    [HttpPost]
    public async Task<ActionResult<Location>> Create(CreateLocationRequest request, CancellationToken cancellationToken)
    {
        var location = new Location
        {
            Name = request.Name,
            Notes = request.Notes,
        };

        var created = await _locationRepository.AddAsync(location, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Location>> Update(Guid id, UpdateLocationRequest request, CancellationToken cancellationToken)
    {
        var existing = await _locationRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        existing.Name = request.Name;
        existing.Notes = request.Notes;

        var updated = await _locationRepository.UpdateAsync(existing, cancellationToken);
        return updated ? Ok(existing) : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _locationRepository.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
