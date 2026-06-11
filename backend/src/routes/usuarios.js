const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRolId } = require("../middlewares/roles");

// Solo roles administradores (id 1 y 5) pueden gestionar usuarios
const soloCoordinador = [auth, requireRolId(1, 5)];

// ─── GET /api/usuarios ─────────────────────────────────────────────────────────
router.get("/", ...soloCoordinador, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u."user", u.nombre, r.nombre AS rol, u.rol_id, u.estado_id, (u.estado_id = 1) AS activo, u.created_at,
            array_agg(ul.localidad_id ORDER BY ul.localidad_id) FILTER (WHERE ul.localidad_id IS NOT NULL) AS localidades
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN usuario_localidades ul ON ul.usuario_id = u.id
     GROUP BY u.id, r.nombre
     ORDER BY u.nombre`
  );
  res.json(rows);
});

// ─── GET /api/usuarios/roles ──────────────────────────────────────────────────
router.get("/roles", ...soloCoordinador, async (req, res) => {
  const { rows } = await pool.query(`SELECT id, nombre FROM roles ORDER BY id`);
  res.json(rows);
});

// ─── GET /api/usuarios/:id ─────────────────────────────────────────────────────
router.get("/:id", ...soloCoordinador, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u."user", u.nombre, r.nombre AS rol, u.rol_id, (u.estado_id = 1) AS activo, u.created_at,
            array_agg(ul.localidad_id ORDER BY ul.localidad_id) FILTER (WHERE ul.localidad_id IS NOT NULL) AS localidades
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN usuario_localidades ul ON ul.usuario_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, r.nombre`,
    [Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json(rows[0]);
});

// ─── POST /api/usuarios ────────────────────────────────────────────────────────
router.post(
  "/",
  ...soloCoordinador,
  [
    body("user").notEmpty().matches(/^[a-z0-9_]+$/).withMessage("El usuario solo puede contener letras minúsculas, números y guiones bajos."),
    body("nombre").notEmpty().trim(),
    body("rol_id").isInt().withMessage("Debe seleccionar un rol."),
    body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres."),
    body("localidades").optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { user, nombre, rol_id, password, localidades } = req.body;

    const { rows: existe } = await pool.query(`SELECT id FROM usuarios WHERE "user"=$1`, [user]);
    if (existe.length) return res.status(409).json({ error: "Ya existe un usuario con ese nombre de usuario." });

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: inserted } = await client.query(
        `INSERT INTO usuarios ("user", nombre, rol_id, password_hash, estado_id) VALUES ($1,$2,$3,$4,1) RETURNING id`,
        [user, nombre.trim(), Number(rol_id), hash]
      );
      const newId = inserted[0].id;

      if (localidades?.length) {
        for (const locId of localidades) {
          await client.query(
            `INSERT INTO usuario_localidades (usuario_id, localidad_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [newId, Number(locId)]
          );
        }
      }

      await client.query("COMMIT");
      const { rows } = await client.query(
        `SELECT u.id, u."user", u.nombre, r.nombre AS rol, u.rol_id, u.estado_id, (u.estado_id = 1) AS activo,
                array_agg(ul.localidad_id) FILTER (WHERE ul.localidad_id IS NOT NULL) AS localidades
         FROM usuarios u
         LEFT JOIN roles r ON r.id = u.rol_id
         LEFT JOIN usuario_localidades ul ON ul.usuario_id = u.id
         WHERE u.id = $1
         GROUP BY u.id, r.nombre`,
        [newId]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/usuarios/:id ─────────────────────────────────────────────────────
router.put(
  "/:id",
  ...soloCoordinador,
  [
    body("nombre").optional().notEmpty().trim(),
    body("rol_id").optional().isInt(),
    body("password").optional().isLength({ min: 6 }),
    body("estado_id").optional().isInt(),
    body("localidades").optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = Number(req.params.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(`SELECT * FROM usuarios WHERE id=$1`, [userId]);
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });

      const { nombre, rol_id, password, estado_id, localidades } = req.body;
      const updates = [];
      const params = [];

      if (nombre !== undefined) { updates.push(`nombre=$${params.push(nombre.trim())}`); }
      if (rol_id !== undefined) { updates.push(`rol_id=$${params.push(Number(rol_id))}`); }
      if (estado_id !== undefined && [1, 2, 6].includes(Number(estado_id))) {
        updates.push(`estado_id=$${params.push(Number(estado_id))}`);
      }
      if (password) { updates.push(`password_hash=$${params.push(await bcrypt.hash(password, 10))}`); }

      if (updates.length) {
        updates.push(`updated_at=$${params.push(new Date().toISOString())}`);
        await client.query(`UPDATE usuarios SET ${updates.join(",")} WHERE id=$${params.push(userId)}`, params);
      }

      if (localidades !== undefined) {
        await client.query(`DELETE FROM usuario_localidades WHERE usuario_id=$1`, [userId]);
        for (const locId of localidades) {
          await client.query(`INSERT INTO usuario_localidades (usuario_id, localidad_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, Number(locId)]);
        }
      }

      await client.query("COMMIT");
      const { rows: updated } = await client.query(
        `SELECT u.id, u."user", u.nombre, r.nombre AS rol, u.rol_id, u.estado_id, (u.estado_id = 1) AS activo,
                array_agg(ul.localidad_id) FILTER (WHERE ul.localidad_id IS NOT NULL) AS localidades
         FROM usuarios u
         LEFT JOIN roles r ON r.id = u.rol_id
         LEFT JOIN usuario_localidades ul ON ul.usuario_id = u.id
         WHERE u.id = $1
         GROUP BY u.id, r.nombre`,
        [userId]
      );
      res.json(updated[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── DELETE /api/usuarios/:id/eliminar — verifica registros y elimina definitivamente
router.delete("/:id/eliminar", ...soloCoordinador, async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.usuario.id) {
    return res.status(400).json({ error: "No puede eliminar su propio usuario." });
  }
  const { rows: regs } = await pool.query(
    `SELECT COUNT(*) AS total FROM registros WHERE usuario_id_carga = $1`,
    [userId]
  );
  if (Number(regs[0].total) > 0) {
    return res.status(409).json({ error: "No se puede eliminar usuario por tener registros asociados" });
  }
  const { rows } = await pool.query(
    `DELETE FROM usuarios WHERE id=$1 RETURNING id`,
    [userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ mensaje: "Usuario eliminado" });
});

// ─── DELETE /api/usuarios/:id — desactiva, no elimina ─────────────────────────
router.delete("/:id", ...soloCoordinador, async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.usuario.id) {
    return res.status(400).json({ error: "No puede desactivar su propio usuario." });
  }
  const { rows } = await pool.query(
    `UPDATE usuarios SET estado_id=2, updated_at=NOW() WHERE id=$1 RETURNING id`,
    [userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ mensaje: "Usuario desactivado." });
});

// ─── PUT /api/usuarios/me/password — cualquier usuario cambia su propia contraseña
router.put(
  "/me/password",
  auth,
  [
    body("actual").notEmpty().withMessage("Debe ingresar la contraseña actual."),
    body("nueva").isLength({ min: 6 }).withMessage("La nueva contraseña debe tener al menos 6 caracteres."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { actual, nueva } = req.body;
    const { rows } = await pool.query(`SELECT password_hash FROM usuarios WHERE id=$1`, [req.usuario.id]);
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });

    const coincide = await bcrypt.compare(actual, rows[0].password_hash);
    if (!coincide) return res.status(400).json({ error: "La contraseña actual es incorrecta." });

    const hash = await bcrypt.hash(nueva, 10);
    await pool.query(`UPDATE usuarios SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, req.usuario.id]);
    res.json({ mensaje: "Contraseña actualizada correctamente." });
  }
);

// ─── GET /api/usuarios/modalidades/lista ──────────────────────────────────────
router.get("/modalidades/lista", auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre, tm.nombre AS cat
     FROM modalidades m
     INNER JOIN tipo_modalidad tm ON tm.id = m.id_tipo_modadlidad
     WHERE m.estado_id = 1
     ORDER BY tm.nombre, m.nombre`
  );
  res.json(rows);
});

module.exports = router;
