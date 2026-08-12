-- D1 schema for the deployed Worker's Wizard backend. A component/request is
-- stored as one JSON blob per row (matching the shape ComponentSpecSchema /
-- ComponentRequestSchema already validate) rather than normalized columns —
-- the local dev-server stores the exact same shapes as one JSON file each,
-- and this keeps the two backends trivially in sync with no migration to
-- run every time a schema field is added.

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  brief TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  spec TEXT NOT NULL,
  changelog TEXT,
  react_tsx TEXT,
  react_css TEXT,
  updated_at TEXT NOT NULL
);
