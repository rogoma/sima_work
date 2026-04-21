const router = require("express").Router();
const { body, query, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRol, puedeAccederLocalidad } = require("../middlewares/roles");

// ─── Genera el próximo ID de registro ─────────────────────────────────────────
async function generarId(client) {
  const { rows } = await client.query("SELECT nextval('registros_seq') AS n");
  return `REG-${String(rows[0].n).padStart(4, "0")}`;
}

// ─── Carga el registro completo con historial ─────────────────────────────────
async function cargarRegistro(client, id) {
  const { rows: regs } = await client.query(
    `SELECT r.*, l.nombre AS localidad_nombre, m.nombre AS modalidad_nombre, m.cat AS modalidad_cat
     FROM registros r
     JOIN localidades l ON l.id = r.localidad_id
     JOIN modalidades m ON m.id = r.modalidad_id
     WHERE r.id = $1`,
    [id]
  );
  if (!regs.length) return null;

  const { rows: hist } = await client.query(
    `SELECT h.estado, h.fecha, h.por, h.comentario, u.nombre AS por_nombre
     FROM historial_registros h
     JOIN usuarios u ON u.id = h.por
     WHERE h.registro_id = $1
     ORDER BY h.fecha ASC`,
    [id]
  );

  return { ...regs[0], historial: hist };
}

// ─── GET /api/registros ────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const { localidad, tipo, estado, busqueda, page = 1, limit = 50 } = req.query;
  const usuario = req.usuario;

  const params = [];
  const wheres = [];

  // Restricción por rol
  if (usuario.rol === "junta") {
    wheres.push(`r.localidad_id = ANY($${params.push(usuario.localidades)})`);
  } else if (usuario.rol === "contratista") {
    wheres.push(`r.cargado_por = $${params.push(usuario.id)}`);
    if (usuario.localidades?.length) {
      wheres.push(`r.localidad_id = ANY($${params.push(usuario.localidades)})`);
    }
  }

  if (localidad) wheres.push(`r.localidad_id = $${params.push(Number(localidad))}`);
  if (tipo) wheres.push(`r.tipo = $${params.push(tipo)}`);
  if (estado) wheres.push(`r.estado = $${params.push(estado)}`);
  if (busqueda) {
    wheres.push(
      `(r.titular ILIKE $${params.push("%" + busqueda + "%")} OR r.ci ILIKE $${params.push("%" + busqueda + "%")} OR r.id ILIKE $${params.push("%" + busqueda + "%")})`
    );
  }

  const where = wheres.length ? "WHERE " + wheres.join(" AND ") : "";
  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `SELECT r.id, r.localidad_id, l.nombre AS localidad_nombre,
            r.tipo, r.modalidad_id, m.nombre AS modalidad_nombre, m.cat AS modalidad_cat,
            r.titular, r.ci, r.celular, r.manzana, r.lote,
            r.fecha_ejec, r.fecha_carga, r.estado,
            r.cargado_por, u.nombre AS cargado_por_nombre,
            r.evidencia_url, r.observaciones
     FROM registros r
     JOIN localidades l ON l.id = r.localidad_id
     JOIN modalidades m ON m.id = r.modalidad_id
     JOIN usuarios u ON u.id = r.cargado_por
     ${where}
     ORDER BY r.fecha_carga DESC
     LIMIT $${params.push(Number(limit))} OFFSET $${params.push(offset)}`,
    params
  );

  const { rows: total } = await pool.query(
    `SELECT COUNT(*) FROM registros r ${where}`,
    params.slice(0, params.length - 2)
  );

  res.json({ data: rows, total: Number(total[0].count), page: Number(page), limit: Number(limit) });
});

// ─── GET /api/registros/:id ────────────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const reg = await cargarRegistro(client, req.params.id);
    if (!reg) return res.status(404).json({ error: "Registro no encontrado." });

    if (!puedeAccederLocalidad(req.usuario, reg.localidad_id)) {
      return res.status(403).json({ error: "Sin acceso a esta localidad." });
    }
    if (req.usuario.rol === "contratista" && reg.cargado_por !== req.usuario.id) {
      return res.status(403).json({ error: "Solo puede ver sus propios registros." });
    }

    res.json(reg);
  } finally {
    client.release();
  }
});

// ─── POST /api/registros ───────────────────────────────────────────────────────
router.post(
  "/",
  auth,
  [
    body("localidad_id").notEmpty(),
    body("tipo").isIn(["conectado", "adecuacion"]),
    body("modalidad_id").notEmpty(),
    body("titular").notEmpty().trim(),
    body("ci").notEmpty().trim(),
    body("manzana").notEmpty().trim(),
    body("lote").notEmpty().trim(),
    body("fecha_ejec").isDate(),
    body("evidencia_url").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { localidad_id, tipo, modalidad_id, titular, ci, celular, manzana, lote, fecha_ejec, evidencia_url, observaciones } = req.body;
    const usuario = req.usuario;

    if (!puedeAccederLocalidad(usuario, localidad_id)) {
      return res.status(403).json({ error: "Sin acceso a esa localidad." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verificar duplicado bloqueante (misma parcela + tipo validado)
      const { rows: dup } = await client.query(
        `SELECT id FROM registros WHERE localidad_id=$1 AND manzana=$2 AND lote=$3 AND tipo=$4 AND estado='validado'`,
        [Number(localidad_id), manzana, lote, tipo]
      );
      if (dup.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: `Ya existe un registro VALIDADO para esta parcela (${dup[0].id}).`, codigo: "DUPLICADO_VALIDADO" });
      }

      const id = await generarId(client);
      const ahora = new Date().toISOString();

      await client.query(
        `INSERT INTO registros (id, localidad_id, tipo, modalidad_id, titular, ci, celular, manzana, lote, fecha_ejec, fecha_carga, estado, cargado_por, evidencia_url, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pendiente',$12,$13,$14)`,
        [id, Number(localidad_id), tipo, Number(modalidad_id), titular, ci, celular || null, manzana, lote, fecha_ejec, ahora, usuario.id, evidencia_url, observaciones || null]
      );

      await client.query(
        `INSERT INTO historial_registros (registro_id, estado, fecha, por) VALUES ($1,'pendiente',$2,$3)`,
        [id, ahora, usuario.id]
      );

      await client.query("COMMIT");
      const regClient = await pool.connect();
      try {
        const reg = await cargarRegistro(regClient, id);
        res.status(201).json(reg);
      } finally {
        regClient.release();
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/registros/:id — Corregir registro rechazado ─────────────────────
router.put(
  "/:id",
  auth,
  [
    body("evidencia_url").notEmpty(),
    body("fecha_ejec").isDate(),
    body("modalidad_id").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(`SELECT * FROM registros WHERE id=$1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      const reg = rows[0];

      if (reg.estado !== "rechazado") {
        return res.status(400).json({ error: "Solo se pueden corregir registros rechazados." });
      }
      if (reg.cargado_por !== req.usuario.id) {
        return res.status(403).json({ error: "Solo el usuario que cargó el registro puede corregirlo." });
      }

      const { modalidad_id, tipo, titular, ci, celular, manzana, lote, fecha_ejec, evidencia_url, observaciones } = req.body;
      const ahora = new Date().toISOString();

      await client.query(
        `UPDATE registros SET modalidad_id=$1, tipo=$2, titular=$3, ci=$4, celular=$5, manzana=$6, lote=$7, fecha_ejec=$8, evidencia_url=$9, observaciones=$10, estado='pendiente', updated_at=$11 WHERE id=$12`,
        [Number(modalidad_id), tipo || reg.tipo, titular || reg.titular, ci || reg.ci, celular ?? reg.celular, manzana || reg.manzana, lote || reg.lote, fecha_ejec, evidencia_url, observaciones ?? reg.observaciones, ahora, reg.id]
      );

      await client.query(
        `INSERT INTO historial_registros (registro_id, estado, fecha, por) VALUES ($1,'pendiente',$2,$3)`,
        [reg.id, ahora, req.usuario.id]
      );

      await client.query("COMMIT");
      const updated = await cargarRegistro(client, reg.id);
      res.json(updated);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PATCH /api/registros/:id/validar — Solo coordinador ──────────────────────
router.patch("/:id/validar", auth, requireRol("coordinador"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`SELECT estado FROM registros WHERE id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
    if (rows[0].estado !== "pendiente") return res.status(400).json({ error: "Solo se pueden validar registros pendientes." });

    const ahora = new Date().toISOString();
    const comentario = req.body.comentario || null;

    await client.query(`UPDATE registros SET estado='validado', updated_at=$1 WHERE id=$2`, [ahora, req.params.id]);
    await client.query(
      `INSERT INTO historial_registros (registro_id, estado, fecha, por, comentario) VALUES ($1,'validado',$2,$3,$4)`,
      [req.params.id, ahora, req.usuario.id, comentario]
    );

    await client.query("COMMIT");
    const reg = await cargarRegistro(client, req.params.id);
    res.json(reg);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── PATCH /api/registros/:id/rechazar — Solo coordinador ─────────────────────
router.patch(
  "/:id/rechazar",
  auth,
  requireRol("coordinador"),
  [body("comentario").notEmpty().withMessage("El motivo de rechazo es obligatorio.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(`SELECT estado FROM registros WHERE id=$1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      if (rows[0].estado !== "pendiente") return res.status(400).json({ error: "Solo se pueden rechazar registros pendientes." });

      const ahora = new Date().toISOString();

      await client.query(`UPDATE registros SET estado='rechazado', updated_at=$1 WHERE id=$2`, [ahora, req.params.id]);
      await client.query(
        `INSERT INTO historial_registros (registro_id, estado, fecha, por, comentario) VALUES ($1,'rechazado',$2,$3,$4)`,
        [req.params.id, ahora, req.usuario.id, req.body.comentario]
      );

      await client.query("COMMIT");
      const reg = await cargarRegistro(client, req.params.id);
      res.json(reg);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

module.exports = router;
