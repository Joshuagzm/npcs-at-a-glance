-- Persisted locations, plus a link table tying NPCs to the location they're in.
-- The npcs.location_id column stays as the NPC's own field; npc.npc_locations is
-- the relational join, foreign-keyed to both sides. Idempotent.

CREATE TABLE IF NOT EXISTS npc.locations (
    id          uuid        PRIMARY KEY,
    name        text        NOT NULL,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per NPC (an NPC is in a single location); upserted whenever an NPC is
-- created or updated with a location set, and removed when the location is cleared.
CREATE TABLE IF NOT EXISTS npc.npc_locations (
    npc_id      uuid        PRIMARY KEY REFERENCES npc.npcs (id) ON DELETE CASCADE,
    location_id uuid        NOT NULL    REFERENCES npc.locations (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_npc_locations_location_id ON npc.npc_locations (location_id);
