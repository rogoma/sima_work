-- ─── SIMSAS · Migración inicial (IDs integer) ──────────────────────────────────
-- Adaptada a la nueva estructura con IDs numéricos y tabla de roles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── LOCALIDADES ──────────────────────────────────────────────────────────────
CREATE TABLE localidades (
  id            SERIAL       PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  previstas     INTEGER      NOT NULL DEFAULT 0,
  conectados    INTEGER      NOT NULL DEFAULT 0,
  adecuaciones  INTEGER      NOT NULL DEFAULT 0,
  ci            INTEGER      NOT NULL DEFAULT 0
);

-- ─── ROLES ────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id      SERIAL       PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL
);

-- ─── USUARIOS ─────────────────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id             SERIAL       PRIMARY KEY,
  "user"         VARCHAR(50),
  nombre         VARCHAR(150) NOT NULL,
  rol_id         INTEGER      REFERENCES roles(id),
  password_hash  VARCHAR(200) NOT NULL,
  activo         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Localidades asignadas a cada usuario
CREATE TABLE usuario_localidades (
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  localidad_id INTEGER NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
  PRIMARY KEY (localidad_id, usuario_id)
);

-- ─── MODALIDADES ──────────────────────────────────────────────────────────────
CREATE TABLE modalidades (
  id      SERIAL       PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL,
  cat     VARCHAR(20)  NOT NULL,
  activo  BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Roles permitidos por modalidad
CREATE TABLE modalidad_roles (
  modalidad_id  INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  rol_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, modalidad_id)
);

-- ─── REGISTROS ────────────────────────────────────────────────────────────────
CREATE SEQUENCE registros_seq START 1;

CREATE TABLE registros (
  id             VARCHAR(20)  PRIMARY KEY,
  localidad_id   INTEGER      REFERENCES localidades(id),
  tipo           VARCHAR(20)  NOT NULL,
  modalidad_id   INTEGER      REFERENCES modalidades(id),
  titular        VARCHAR(200) NOT NULL,
  ci             VARCHAR(30)  NOT NULL UNIQUE,
  celular        VARCHAR(30),
  manzana        VARCHAR(20)  NOT NULL,
  lote           VARCHAR(20)  NOT NULL,
  fecha_ejec     DATE         NOT NULL,
  fecha_carga    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  estado         VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  cargado_por    INTEGER      REFERENCES usuarios(id),
  evidencia_url  VARCHAR(500),
  observaciones  TEXT,
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_registros_estado ON registros(estado);

-- ─── HISTORIAL DE ESTADOS ─────────────────────────────────────────────────────
CREATE TABLE historial_registros (
  id           SERIAL       PRIMARY KEY,
  registro_id  VARCHAR(20)  NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  estado       VARCHAR(20)  NOT NULL,
  fecha        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  por          INTEGER      REFERENCES usuarios(id),
  comentario   TEXT
);

-- ─── PROYECCIONES ICARO ───────────────────────────────────────────────────────
CREATE TABLE icaro_proyecciones (
  id            SERIAL   PRIMARY KEY,
  localidad_id  INTEGER  NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
  modalidad_id  INTEGER  NOT NULL REFERENCES modalidades(id),
  cantidad      INTEGER  NOT NULL DEFAULT 0
);
