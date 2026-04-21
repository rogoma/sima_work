const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRol } = require("../middlewares/roles");

const soloCoordinador = [auth, requireRol("coordinador")];

// ─── GET /api/roles ────────────────────────────────────────────────────────────
router.get("/", ...soloCoordinador, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.nombre,
            COUNT(u.id)::int AS cantidad_usuarios
     FROM roles r
     LEFT JOIN usuarios u ON u.rol_id = r.id
     GROUP BY r.id
     ORDER BY r.id`
  );
  res.json(rows);
});

// ─── POST /api/roles ───────────────────────────────────────────────────────────
router.post(
  "/",
  ...soloCoordinador,
  [body("nombre").notEmpty().trim().withMessage("El nombre del rol es requerido.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre } = req.body;
    const { rows: existe } = await pool.query(
      `SELECT id FROM roles WHERE LOWER(nombre)=LOWER($1)`,
      [nombre.trim()]
    );
    if (existe.length) return res.status(409).json({ error: "Ya existe un rol con ese nombre." });

    const { rows } = await pool.query(
      `INSERT INTO roles (nombre) VALUES ($1) RETURNING id, nombre`,
      [nombre.trim()]
    );
    res.status(201).json({ ...rows[0], cantidad_usuarios: 0 });
  }
);

// ─── PUT /api/roles/:id ────────────────────────────────────────────────────────
router.put(
  "/:id",
  ...soloCoordinador,
  [body("nombre").notEmpty().trim().withMessage("El nombre del rol es requerido.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const rolId = Number(req.params.id);
    const { nombre } = req.body;

    const { rows: existe } = await pool.query(
      `SELECT id FROM roles WHERE LOWER(nombre)=LOWER($1) AND id<>$2`,
      [nombre.trim(), rolId]
    );
    if (existe.length) return res.status(409).json({ error: "Ya existe un rol con ese nombre." });

    const { rows } = await pool.query(
      `UPDATE roles SET nombre=$1 WHERE id=$2 RETURNING id, nombre`,
      [nombre.trim(), rolId]
    );
    if (!rows.length) return res.status(404).json({ error: "Rol no encontrado." });

    const { rows: updated } = await pool.query(
      `SELECT r.id, r.nombre, COUNT(u.id)::int AS cantidad_usuarios
       FROM roles r LEFT JOIN usuarios u ON u.rol_id = r.id
       WHERE r.id=$1 GROUP BY r.id`,
      [rolId]
    );
    res.json(updated[0]);
  }
);

// ─── DELETE /api/roles/:id ─────────────────────────────────────────────────────
router.delete("/:id", ...soloCoordinador, async (req, res) => {
  const rolId = Number(req.params.id);

  const { rows: usuarios } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM usuarios WHERE rol_id=$1`,
    [rolId]
  );
  if (usuarios[0].total > 0) {
    return res.status(409).json({
      error: `No se puede eliminar: hay ${usuarios[0].total} usuario(s) con este rol.`,
    });
  }

  const { rows } = await pool.query(
    `DELETE FROM roles WHERE id=$1 RETURNING id`,
    [rolId]
  );
  if (!rows.length) return res.status(404).json({ error: "Rol no encontrado." });
  res.json({ mensaje: "Rol eliminado." });
});

module.exports = router;
