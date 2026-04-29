CREATE TABLE cards (
  id          TEXT PRIMARY KEY,
  typename    TEXT NOT NULL,        -- UnitCard, PilotCard, CommandCard, BaseCard, ResourceCard
  name_en     TEXT NOT NULL,
  name_ko     TEXT NOT NULL,
  color       TEXT,
  level       INT,
  cost        INT,
  ap          INT,
  hp          INT,
  rarity      TEXT NOT NULL,
  package     TEXT NOT NULL,
  series      TEXT,
  traits      TEXT[] NOT NULL DEFAULT '{}',
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  zone        TEXT[] NOT NULL DEFAULT '{}',
  image_file  TEXT,
  raw         JSONB NOT NULL,       -- 원본 데이터 전체 보존
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cards_color_idx   ON cards (color);
CREATE INDEX cards_cost_idx    ON cards (cost);
CREATE INDEX cards_typename_idx ON cards (typename);
CREATE INDEX cards_traits_gin  ON cards USING GIN (traits);
CREATE INDEX cards_keywords_gin ON cards USING GIN (keywords);
