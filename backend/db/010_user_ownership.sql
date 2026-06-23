-- Per-user ownership: tie each NPC and location to the user that created it.
-- user_id holds an Identity user id (users.users.id). No foreign key is declared
-- on purpose — the npc schema (hand-written SQL) is kept decoupled from the
-- users schema (managed by EF migrations); ownership is enforced in the app.
-- Existing rows predate ownership and keep user_id NULL, so they belong to no
-- one and are not returned to any user. Idempotent.

ALTER TABLE npc.npcs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE npc.locations ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS ix_npcs_user_id ON npc.npcs (user_id);
CREATE INDEX IF NOT EXISTS ix_locations_user_id ON npc.locations (user_id);
