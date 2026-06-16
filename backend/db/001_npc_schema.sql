-- Schema and table for persisting NPC data.
-- Applied to the Postgres container (database: appdb). Idempotent.

CREATE SCHEMA IF NOT EXISTS npc;

CREATE TABLE IF NOT EXISTS npc.npcs (
    id                  uuid        PRIMARY KEY,
    name                text        NOT NULL,
    role                text,
    location_id         uuid,
    level               integer     NOT NULL DEFAULT 1,
    is_hostile          boolean     NOT NULL DEFAULT false,
    notes               text,
    likes               text,
    dislikes            text,
    goals               text,
    current_hit_points  integer,
    max_hit_points      integer,
    -- NpcStatBlock (nested object with trait/action lists) stored as a document.
    stat_block          jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_npcs_location_id ON npc.npcs (location_id);
