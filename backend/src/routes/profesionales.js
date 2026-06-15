const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middlewares/auth");

// GET /profesionales  — lista completa con joins
router.get("/", auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id, p.ci, p.nombre, p.celular, p.direccion,
        p.localidad_id, p.profesion_id, p.estado_id,
        l.nombre  AS localidad_nombre,
        pr.nombre AS profesion_nombre
      FROM profesionales p
      LEFT JOIN localidades  l  ON l.id  = p.localidad_id
      LEFT JOIN profesiones  pr ON pr.id = p.profesion_id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /profesionales:", err.message);
    res.status(500).json({ error: "Error al obtener profesionales." });
  }
});

// GET /profesionales/profesiones
router.get("/profesiones", auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre FROM profesiones ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /profesiones:", err.message);
    res.status(500).json({ error: "Error al obtener profesiones." });
  }
});

// GET /profesionales/check-ci?ci=xxx  — verifica duplicado de cédula
router.get("/check-ci", auth, async (req, res) => {
  const { ci, excluir_id } = req.query;
  if (!ci) return res.json({ existe: false });
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre FROM profesionales WHERE ci = $1 ${excluir_id ? "AND id <> $2" : ""}`,
      excluir_id ? [ci, excluir_id] : [ci]
    );
    res.json(rows.length > 0 ? { existe: true, nombre: rows[0].nombre } : { existe: false });
  } catch (err) {
    console.error("GET /check-ci:", err.message);
    res.status(500).json({ error: "Error al verificar CI." });
  }
});

// POST /profesionales  — crea un profesional (estado_id = 1 por defecto)
router.post("/", auth, async (req, res) => {
  const { localidad_id, profesion_id, ci, nombre, celular, direccion } = req.body;

  if (!localidad_id)    return res.status(400).json({ error: "Localidad requerida." });
  if (!profesion_id)    return res.status(400).json({ error: "Profesión requerida." });
  if (!ci?.trim())      return res.status(400).json({ error: "CI requerida." });
  if (!nombre?.trim())  return res.status(400).json({ error: "Nombre requerido." });

  const ciRaw = String(ci).replace(/\./g, "").trim();

  try {
    const dup = await pool.query("SELECT id FROM profesionales WHERE ci = $1", [ciRaw]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe un profesional registrado con esta cédula." });
    }

    const { rows } = await pool.query(
      `INSERT INTO profesionales (localidad_id, profesion_id, ci, nombre, celular, direccion, estado_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
      [localidad_id, profesion_id, ciRaw, nombre.trim(), celular?.trim() || null, direccion?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("POST /profesionales:", e.message);
    if (e.code === "23505") {
      return res.status(409).json({ error: "Ya existe un profesional registrado con esta cédula." });
    }
    res.status(500).json({ error: e.message || "Error al registrar el profesional." });
  }
});

// PUT /profesionales/:id  — edita un profesional
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { localidad_id, profesion_id, ci, nombre, celular, direccion, estado_id } = req.body;

  if (!localidad_id)    return res.status(400).json({ error: "Localidad requerida." });
  if (!profesion_id)    return res.status(400).json({ error: "Profesión requerida." });
  if (!ci?.trim())      return res.status(400).json({ error: "CI requerida." });
  if (!nombre?.trim())  return res.status(400).json({ error: "Nombre requerido." });

  const ciRaw = String(ci).replace(/\./g, "").trim();

  try {
    // Verificar duplicado de CI excluyendo el registro actual
    const dup = await pool.query(
      "SELECT id FROM profesionales WHERE ci = $1 AND id <> $2",
      [ciRaw, id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe otro profesional con esta cédula." });
    }

    const { rows } = await pool.query(
      `UPDATE profesionales
       SET localidad_id = $1, profesion_id = $2, ci = $3, nombre = $4,
           celular = $5, direccion = $6, estado_id = $7
       WHERE id = $8
       RETURNING *`,
      [
        localidad_id, profesion_id, ciRaw, nombre.trim(),
        celular?.trim() || null, direccion?.trim() || null,
        estado_id ?? 1,
        id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Profesional no encontrado." });
    res.json(rows[0]);
  } catch (e) {
    console.error("PUT /profesionales/:id:", e.message);
    if (e.code === "23505") {
      return res.status(409).json({ error: "Ya existe otro profesional con esta cédula." });
    }
    res.status(500).json({ error: e.message || "Error al actualizar el profesional." });
  }
});

module.exports = router;
