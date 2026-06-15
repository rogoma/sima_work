-- ─── Migración 005: Tablas profesiones y profesionales ───────────────────────

CREATE TABLE IF NOT EXISTS profesiones (
  id     SERIAL       PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

INSERT INTO profesiones (nombre) VALUES
  ('Albañil'),
  ('Arquitecto'),
  ('Electricista'),
  ('Ingeniero Civil'),
  ('Maestro de Obras'),
  ('Plomero'),
  ('Sanitarista'),
  ('Técnico en Construcción'),
  ('Topógrafo'),
  ('Otro')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS profesionales (
  id           SERIAL       PRIMARY KEY,
  localidad_id INTEGER      REFERENCES localidades(id),
  profesion_id INTEGER      REFERENCES profesiones(id),
  ci           VARCHAR(30)  NOT NULL,
  nombre       VARCHAR(200) NOT NULL,
  celular      VARCHAR(30),
  direccion    VARCHAR(100),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT profesionales_ci_unique UNIQUE (ci)
);
