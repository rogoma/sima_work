const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRol } = require("../middlewares/roles");

const soloCoordinador = [auth, requireRol("coordinador")];

const CATS = ["JUNTA", "CONTRATISTA", "ICARO"];

async function queryOne(id) {
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.cat, m.activo,
            array_agg(mr.rol_id ORDER BY mr.rol_id) FILTER (WHERE mr.rol_id IS NOT NULL) AS roles
     FROM modalidades m
     LEFT JOIN modalidad_roles mr ON mr.modalidad_id = m.id
     WHERE m.id = $1
     GROUP BY m.id`,
    [id]
  );
  return rows[0] || null;
}

// ─── GET /api/modalidades — todas (admin) ─────────────────────────────────────
router.get("/", ...soloCoordinador, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, m.cat, m.activo,
            array_agg(mr.rol_id ORDER BY mr.rol_id) FILTER (WHERE mr.rol_id IS NOT NULL) AS roles
     FROM modalidades m
     LEFT JOIN modalidad_roles mr ON mr.modalidad_id = m.id
     GROUP BY m.id
     ORDER BY m.cat, m.nombre`
  );
  res.json(rows);
});

// ─── POST /api/modalidades ────────────────────────────────────────────────────
router.post(
  "/",
  ...soloCoordinador,
  [
    body("nombre").notEmpty().trim().withMessage("El nombre es requerido."),
    body("cat").isIn(CATS).withMessage("Categoría inválida."),
    body("roles").isArray({ min: 1 }).withMessage("Seleccione al menos un rol."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, cat, roles } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO modalidades (nombre, cat) VALUES ($1, $2) RETURNING id`,
        [nombre.trim(), cat]
      );
      const newId = rows[0].id;
      for (const rolId of roles) {
        await client.query(
          `INSERT INTO modalidad_roles (modalidad_id, rol_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newId, Number(rolId)]
        );
      }
      await client.query("COMMIT");
      const created = await queryOne(newId);
      res.status(201).json(created);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/modalidades/:id ─────────────────────────────────────────────────
router.put(
  "/:id",
  ...soloCoordinador,
  [
    body("nombre").optional().notEmpty().trim(),
    body("cat").optional().isIn(CATS),
    body("roles").optional().isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = Number(req.params.id);
    const { nombre, cat, roles } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updates = [];
      const params = [];
      if (nombre !== undefined) updates.push(`nombre=$${params.push(nombre.trim())}`);
      if (cat !== undefined) updates.push(`cat=$${params.push(cat)}`);
      if (updates.length) {
        await client.query(
          `UPDATE modalidades SET ${updates.join(",")} WHERE id=$${params.push(id)}`,
          params
        );
      }

      if (roles !== undefined) {
        await client.query(`DELETE FROM modalidad_roles WHERE modalidad_id=$1`, [id]);
        for (const rolId of roles) {
          await client.query(
            `INSERT INTO modalidad_roles (modalidad_id, rol_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [id, Number(rolId)]
          );
        }
      }

      await client.query("COMMIT");
      const updated = await queryOne(id);
      if (!updated) return res.status(404).json({ error: "Modalidad no encontrada." });
      res.json(updated);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── DELETE /api/modalidades/:id — desactiva ──────────────────────────────────
router.delete("/:id", ...soloCoordinador, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE modalidades SET activo=false WHERE id=$1 RETURNING id`,
    [Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: "Modalidad no encontrada." });
  res.json({ mensaje: "Modalidad desactivada." });
});

module.exports = router;
