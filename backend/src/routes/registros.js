const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRol, puedeAccederLocalidad } = require("../middlewares/roles");

// estados: 3=Rechazado, 4=Validado, 5=Pendiente
// tipo_registro: 1=Conectado, 2=Adecuación
const ESTADO_IDS  = { pendiente: 5, validado: 4, rechazado: 3 };
const TIPO_IDS    = { conectado: 1, adecuacion: 2 };

// ─── Carga el registro completo con historial ─────────────────────────────────
async function cargarRegistro(client, id) {
  const { rows: regs } = await client.query(
    `SELECT r.*,
            l.nombre  AS localidad_nombre,
            m.nombre  AS modalidad_nombre,
            tm.nombre AS modalidad_cat,
            CASE r.tipo_registro_id WHEN 1 THEN 'conectado' WHEN 2 THEN 'adecuacion' END AS tipo,
            LOWER(e.nombre) AS estado
     FROM registros r
     JOIN localidades l  ON l.id  = r.localidad_id
     JOIN modalidades m  ON m.id  = r.modalidad_id
     LEFT JOIN tipo_modalidad tm ON tm.id = m.id_tipo_modadlidad
     LEFT JOIN tipo_registro  tr ON tr.id = r.tipo_registro_id
     LEFT JOIN estados        e  ON e.id  = r.estado_id
     WHERE r.id = $1`,
    [id]
  );
  if (!regs.length) return null;

  const { rows: hist } = await client.query(
    `SELECT h.estado_id, LOWER(e.nombre) AS estado, h.fecha,
            h.usuario_id_verif AS por, h.comentario, u.nombre AS por_nombre
     FROM historial_registros h
     LEFT JOIN estados  e ON e.id  = h.estado_id
     JOIN  usuarios     u ON u.id  = h.usuario_id_verif
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

  if (usuario.rol === "junta") {
    wheres.push(`r.localidad_id = ANY($${params.push(usuario.localidades)})`);
  } else if (usuario.rol === "contratista") {
    wheres.push(`r.usuario_id_carga = $${params.push(usuario.id)}`);
    if (usuario.localidades?.length) {
      wheres.push(`r.localidad_id = ANY($${params.push(usuario.localidades)})`);
    }
  }

  if (localidad) wheres.push(`r.localidad_id = $${params.push(Number(localidad))}`);
  if (tipo && TIPO_IDS[tipo])   wheres.push(`r.tipo_registro_id = $${params.push(TIPO_IDS[tipo])}`);
  if (estado && ESTADO_IDS[estado]) wheres.push(`r.estado_id = $${params.push(ESTADO_IDS[estado])}`);
  if (busqueda) {
    wheres.push(
      `(r.titular ILIKE $${params.push("%" + busqueda + "%")} OR r.ci ILIKE $${params.push("%" + busqueda + "%")} OR CAST(r.id AS VARCHAR) ILIKE $${params.push("%" + busqueda + "%")})`
    );
  }

  const where  = wheres.length ? "WHERE " + wheres.join(" AND ") : "";
  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `SELECT r.id, r.localidad_id, l.nombre AS localidad_nombre,
            r.tipo_registro_id,
            CASE r.tipo_registro_id WHEN 1 THEN 'conectado' WHEN 2 THEN 'adecuacion' END AS tipo,
            r.modalidad_id, m.nombre AS modalidad_nombre, tm.nombre AS modalidad_cat,
            r.titular, r.ci, r.celular, r.manzana, r.lote,
            r.fecha_ejec, r.fecha_carga, r.estado_id, LOWER(e.nombre) AS estado,
            r.usuario_id_carga, u.nombre AS cargado_por_nombre,
            r.evidencia_url, r.observaciones
     FROM registros r
     JOIN localidades l ON l.id = r.localidad_id
     JOIN modalidades m ON m.id = r.modalidad_id
     LEFT JOIN tipo_modalidad tm ON tm.id = m.id_tipo_modadlidad
     LEFT JOIN estados        e  ON e.id  = r.estado_id
     JOIN usuarios u ON u.id = r.usuario_id_carga
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
    if (req.usuario.rol === "contratista" && reg.usuario_id_carga !== req.usuario.id) {
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

    const tipoId = TIPO_IDS[tipo];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: dup } = await client.query(
        `SELECT id FROM registros WHERE localidad_id=$1 AND manzana=$2 AND lote=$3 AND tipo_registro_id=$4 AND estado_id=4`,
        [Number(localidad_id), manzana, lote, tipoId]
      );
      if (dup.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: `Ya existe un registro VALIDADO para esta parcela (${dup[0].id}).`, codigo: "DUPLICADO_VALIDADO" });
      }

      const ahora = new Date().toISOString();

      const { rows: inserted } = await client.query(
        `INSERT INTO registros (localidad_id, tipo_registro_id, modalidad_id, titular, ci, celular, manzana, lote, fecha_ejec, fecha_carga, estado_id, usuario_id_carga, evidencia_url, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,5,$11,$12,$13)
         RETURNING id`,
        [Number(localidad_id), tipoId, Number(modalidad_id), titular, ci, celular || null, manzana, lote, fecha_ejec, ahora, usuario.id, evidencia_url, observaciones || null]
      );
      const newId = inserted[0].id;

      await client.query(
        `INSERT INTO historial_registros (registro_id, estado_id, fecha, usuario_id_verif) VALUES ($1,5,$2,$3)`,
        [newId, ahora, usuario.id]
      );

      await client.query("COMMIT");
      const regClient = await pool.connect();
      try {
        const reg = await cargarRegistro(regClient, newId);
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

      const { rows } = await client.query(`SELECT * FROM registros WHERE id=$1`, [Number(req.params.id)]);
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      const reg = rows[0];

      if (reg.estado_id !== 3) {
        return res.status(400).json({ error: "Solo se pueden corregir registros rechazados." });
      }
      if (reg.usuario_id_carga !== req.usuario.id) {
        return res.status(403).json({ error: "Solo el usuario que cargó el registro puede corregirlo." });
      }

      const { modalidad_id, tipo, titular, ci, celular, manzana, lote, fecha_ejec, evidencia_url, observaciones } = req.body;
      const tipoId = tipo ? TIPO_IDS[tipo] : reg.tipo_registro_id;
      const ahora  = new Date().toISOString();

      await client.query(
        `UPDATE registros SET modalidad_id=$1, tipo_registro_id=$2, titular=$3, ci=$4, celular=$5, manzana=$6, lote=$7, fecha_ejec=$8, evidencia_url=$9, observaciones=$10, estado_id=5, updated_at=$11 WHERE id=$12`,
        [Number(modalidad_id), tipoId, titular || reg.titular, ci || reg.ci, celular ?? reg.celular, manzana || reg.manzana, lote || reg.lote, fecha_ejec, evidencia_url, observaciones ?? reg.observaciones, ahora, reg.id]
      );

      await client.query(
        `INSERT INTO historial_registros (registro_id, estado_id, fecha, usuario_id_verif) VALUES ($1,5,$2,$3)`,
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

// ─── PATCH /api/registros/:id/validar ─────────────────────────────────────────
router.patch("/:id/validar", auth, requireRol("coordinador"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`SELECT estado_id FROM registros WHERE id=$1`, [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
    if (rows[0].estado_id !== 5) return res.status(400).json({ error: "Solo se pueden validar registros pendientes." });

    const ahora     = new Date().toISOString();
    const comentario = req.body.comentario || null;

    await client.query(`UPDATE registros SET estado_id=4, updated_at=$1 WHERE id=$2`, [ahora, Number(req.params.id)]);
    await client.query(
      `INSERT INTO historial_registros (registro_id, estado_id, fecha, usuario_id_verif, comentario) VALUES ($1,4,$2,$3,$4)`,
      [Number(req.params.id), ahora, req.usuario.id, comentario]
    );

    await client.query("COMMIT");
    const reg = await cargarRegistro(client, Number(req.params.id));
    res.json(reg);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── PATCH /api/registros/:id/rechazar ────────────────────────────────────────
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

      const { rows } = await client.query(`SELECT estado_id FROM registros WHERE id=$1`, [Number(req.params.id)]);
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      if (rows[0].estado_id !== 5) return res.status(400).json({ error: "Solo se pueden rechazar registros pendientes." });

      const ahora = new Date().toISOString();

      await client.query(`UPDATE registros SET estado_id=3, updated_at=$1 WHERE id=$2`, [ahora, Number(req.params.id)]);
      await client.query(
        `INSERT INTO historial_registros (registro_id, estado_id, fecha, usuario_id_verif, comentario) VALUES ($1,3,$2,$3,$4)`,
        [Number(req.params.id), ahora, req.usuario.id, req.body.comentario]
      );

      await client.query("COMMIT");
      const reg = await cargarRegistro(client, Number(req.params.id));
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
