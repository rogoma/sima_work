const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const pool = require("../db/pool");
const auth = require("../middlewares/auth");
const { requireRolId, puedeAccederLocalidad } = require("../middlewares/roles");

// estados: 3=Rechazado, 4=Validado, 5=Pendiente
// tipo_registro: 1=Conectado, 2=Adecuación
const ESTADO_IDS = { pendiente: 5, validado: 4, rechazado: 3 };
const TIPO_IDS   = { conectado: 1, adecuacion: 2 };

// ─── Vista plana: JOIN registros (cabecera) + registros_det (parcela) ─────────
// Cada fila representa un registros_det; los campos del beneficiario vienen de registros.
const SELECT_FLAT = `
  SELECT
    det.id,
    reg.id           AS registro_id,
    reg.localidad_id, l.nombre AS localidad_nombre,
    reg.tipo_registro_id,
    CASE reg.tipo_registro_id WHEN 1 THEN 'conectado' WHEN 2 THEN 'adecuacion' END AS tipo,
    reg.modalidad_id, m.nombre AS modalidad_nombre, tm.nombre AS modalidad_cat,
    reg.titular, reg.ci, reg.celular,
    det.manzana, det.lote,
    det.fecha_ejec, det.fecha_carga,
    det.estado_id, LOWER(e.nombre) AS estado,
    det.usuario_id_carga, u.nombre AS cargado_por_nombre,
    det.evidencia_url, det.evidencia_url_2, det.evidencia_url_3,
    det.observaciones, det.updated_at
  FROM registros_det det
  JOIN registros     reg ON reg.id = det.registro_id
  JOIN localidades   l   ON l.id   = reg.localidad_id
  JOIN modalidades   m   ON m.id   = reg.modalidad_id
  LEFT JOIN tipo_modalidad tm ON tm.id = m.id_tipo_modadlidad
  LEFT JOIN estados  e   ON e.id   = det.estado_id
  JOIN usuarios      u   ON u.id   = det.usuario_id_carga
`;

// ─── Carga un detalle completo con historial (id = registros_det.id) ─────────
async function cargarDetalle(client, detId) {
  const { rows } = await client.query(
    `${SELECT_FLAT} WHERE det.id = $1`,
    [detId]
  );
  if (!rows.length) return null;

  const { rows: hist } = await client.query(
    `SELECT h.estado_id, LOWER(e.nombre) AS estado, h.fecha,
            h.usuario_id_verif AS por, h.comentario, u.nombre AS por_nombre
     FROM historial_registros h
     LEFT JOIN estados e ON e.id = h.estado_id
     JOIN  usuarios    u ON u.id = h.usuario_id_verif
     WHERE h.registro_det_id = $1
     ORDER BY h.fecha ASC`,
    [detId]
  );

  return { ...rows[0], historial: hist };
}

// ─── GET /api/registros ────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const { localidad, tipo, estado, busqueda, page = 1, limit = 500 } = req.query;
  const usuario = req.usuario;

  const params = [];
  const wheres = [];

  // Filtros por rol
  if (usuario.rol === "junta") {
    wheres.push(`reg.localidad_id = ANY($${params.push(usuario.localidades)})`);
  } else if (usuario.rol === "contratista") {
    wheres.push(`det.usuario_id_carga = $${params.push(usuario.id)}`);
    if (usuario.localidades?.length) {
      wheres.push(`reg.localidad_id = ANY($${params.push(usuario.localidades)})`);
    }
  }

  if (localidad) wheres.push(`reg.localidad_id = $${params.push(Number(localidad))}`);
  if (tipo && TIPO_IDS[tipo]) wheres.push(`reg.tipo_registro_id = $${params.push(TIPO_IDS[tipo])}`);
  if (estado && ESTADO_IDS[estado]) wheres.push(`det.estado_id = $${params.push(ESTADO_IDS[estado])}`);
  if (busqueda) {
    wheres.push(
      `(reg.titular ILIKE $${params.push("%" + busqueda + "%")}` +
      ` OR reg.ci ILIKE $${params.push("%" + busqueda + "%")}` +
      ` OR CAST(det.id AS VARCHAR) ILIKE $${params.push("%" + busqueda + "%")})`
    );
  }

  const where  = wheres.length ? "WHERE " + wheres.join(" AND ") : "";
  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `${SELECT_FLAT} ${where}
     ORDER BY reg.titular ASC, det.fecha_carga DESC
     LIMIT $${params.push(Number(limit))} OFFSET $${params.push(offset)}`,
    params
  );

  const { rows: total } = await pool.query(
    `SELECT COUNT(*)
     FROM registros_det det
     JOIN registros reg ON reg.id = det.registro_id
     ${where}`,
    params.slice(0, params.length - 2)
  );

  res.json({ data: rows, total: Number(total[0].count), page: Number(page), limit: Number(limit) });
});

// ─── GET /api/registros/check-ci?ci=... ──────────────────────────────────────
// Devuelve el header del beneficiario y todas sus parcelas (registros_det).
router.get("/check-ci", auth, async (req, res) => {
  const ci = (req.query.ci || "").replace(/\./g, "").trim();
  if (!ci) return res.json({ existe: false, parcelas: [] });

  const { rows: header } = await pool.query(
    `SELECT reg.id AS registro_id, reg.titular, reg.celular,
            reg.localidad_id, reg.tipo_registro_id, reg.modalidad_id
     FROM registros reg
     WHERE reg.ci = $1`,
    [ci]
  );

  if (!header.length) return res.json({ existe: false, parcelas: [] });

  const { rows: parcelas } = await pool.query(
    `SELECT det.id, det.manzana, det.lote, det.fecha_ejec,
            LOWER(e.nombre) AS estado, l.nombre AS localidad_nombre
     FROM registros_det det
     JOIN registros  reg ON reg.id = det.registro_id
     JOIN localidades l  ON l.id  = reg.localidad_id
     LEFT JOIN estados e ON e.id  = det.estado_id
     WHERE det.registro_id = $1
     ORDER BY reg.titular ASC, det.fecha_carga DESC`,
    [header[0].registro_id]
  );

  res.json({ existe: true, ...header[0], parcelas });
});

// ─── GET /api/registros/:id (id = registros_det.id) ───────────────────────────
router.get("/:id", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const reg = await cargarDetalle(client, req.params.id);
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
// Busca o crea el header (registros) e inserta un nuevo detalle (registros_det).
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

    const {
      localidad_id, tipo, modalidad_id, titular, ci, celular,
      manzana, lote, fecha_ejec,
      evidencia_url, evidencia_url_2, evidencia_url_3, observaciones,
    } = req.body;
    const usuario = req.usuario;

    if (!puedeAccederLocalidad(usuario, localidad_id)) {
      return res.status(403).json({ error: "Sin acceso a esa localidad." });
    }

    const tipoId = TIPO_IDS[tipo];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Buscar header existente por CI, o crearlo
      const { rows: existing } = await client.query(
        `SELECT id FROM registros WHERE ci = $1`,
        [ci]
      );

      let registroId;
      if (existing.length) {
        registroId = existing[0].id;
      } else {
        const { rows: newReg } = await client.query(
          `INSERT INTO registros (localidad_id, tipo_registro_id, modalidad_id, titular, ci, celular)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [Number(localidad_id), tipoId, Number(modalidad_id), titular, ci, celular || null]
        );
        registroId = newReg[0].id;
      }

      // 2. Verificar duplicado validado para esta parcela en la localidad
      const { rows: dup } = await client.query(
        `SELECT det.id FROM registros_det det
         JOIN registros reg ON reg.id = det.registro_id
         WHERE reg.localidad_id = $1
           AND det.manzana = $2 AND det.lote = $3
           AND reg.tipo_registro_id = $4
           AND det.estado_id = 4`,
        [Number(localidad_id), manzana, lote, tipoId]
      );
      if (dup.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Ya existe un registro VALIDADO para Manzana ${manzana} / Lote ${lote} (${dup[0].id}).`,
          codigo: "DUPLICADO_VALIDADO",
        });
      }

      // 3. Insertar en registros_det
      const ahora = new Date().toISOString();
      const { rows: inserted } = await client.query(
        `INSERT INTO registros_det
           (registro_id, manzana, lote, fecha_ejec, fecha_carga, estado_id,
            usuario_id_carga, evidencia_url, evidencia_url_2, evidencia_url_3, observaciones)
         VALUES ($1,$2,$3,$4,$5,5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          registroId, manzana, lote, fecha_ejec, ahora, usuario.id,
          evidencia_url, evidencia_url_2 || null, evidencia_url_3 || null, observaciones || null,
        ]
      );
      const newDetId = inserted[0].id;

      // 4. Historial
      await client.query(
        `INSERT INTO historial_registros (registro_det_id, estado_id, fecha, usuario_id_verif)
         VALUES ($1,5,$2,$3)`,
        [newDetId, ahora, usuario.id]
      );

      await client.query("COMMIT");

      const detClient = await pool.connect();
      try {
        const det = await cargarDetalle(detClient, newDetId);
        res.status(201).json(det);
      } finally {
        detClient.release();
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/registros/batch ────────────────────────────────────────────────
// Crea N registros_det en una sola transacción.
// Cada parcela lleva sus propios: manzana, lote, fecha_ejec, modalidad_id,
// evidencia_url, evidencia_url_2, evidencia_url_3, observaciones.
// El header (registros) se busca o crea; modalidad_id del header = parcelas[0].modalidad_id.
router.post(
  "/batch",
  auth,
  [
    body("parcelas").isArray({ min: 1 }).withMessage("Debe enviar al menos una parcela."),
    body("parcelas.*.manzana").notEmpty().trim(),
    body("parcelas.*.lote").notEmpty().trim(),
    body("parcelas.*.fecha_ejec").isDate(),
    body("parcelas.*.modalidad_id").notEmpty(),
    body("parcelas.*.evidencia_url").notEmpty(),
    body("localidad_id").notEmpty(),
    body("tipo").isIn(["conectado", "adecuacion"]),
    body("titular").notEmpty().trim(),
    body("ci").notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { parcelas, localidad_id, tipo, titular, ci, celular } = req.body;
    const usuario = req.usuario;

    if (!puedeAccederLocalidad(usuario, localidad_id)) {
      return res.status(403).json({ error: "Sin acceso a esa localidad." });
    }

    const tipoId = TIPO_IDS[tipo];
    // Para el header usamos la modalidad de la primera parcela
    const modalidadHeader = Number(parcelas[0].modalidad_id);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Buscar o crear header
      const { rows: existing } = await client.query(
        `SELECT id FROM registros WHERE ci = $1`,
        [ci]
      );
      let registroId;
      if (existing.length) {
        registroId = existing[0].id;
      } else {
        const { rows: newReg } = await client.query(
          `INSERT INTO registros (localidad_id, tipo_registro_id, modalidad_id, titular, ci, celular)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [Number(localidad_id), tipoId, modalidadHeader, titular, ci, celular || null]
        );
        registroId = newReg[0].id;
      }

      const creados = [];
      const ahora = new Date().toISOString();

      for (const p of parcelas) {
        // Verificar duplicado validado
        const { rows: dup } = await client.query(
          `SELECT det.id FROM registros_det det
           JOIN registros reg ON reg.id = det.registro_id
           WHERE reg.localidad_id = $1
             AND det.manzana = $2 AND det.lote = $3
             AND reg.tipo_registro_id = $4
             AND det.estado_id = 4`,
          [Number(localidad_id), p.manzana, p.lote, tipoId]
        );
        if (dup.length) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: `Manzana ${p.manzana} / Lote ${p.lote} ya tiene un registro VALIDADO (${dup[0].id}).`,
            codigo: "DUPLICADO_VALIDADO",
            parcela: p,
          });
        }

        const { rows: inserted } = await client.query(
          `INSERT INTO registros_det
             (registro_id, manzana, lote, fecha_ejec, fecha_carga, estado_id,
              usuario_id_carga, evidencia_url, evidencia_url_2, evidencia_url_3, observaciones)
           VALUES ($1,$2,$3,$4,$5,5,$6,$7,$8,$9,$10)
           RETURNING id`,
          [
            registroId, p.manzana, p.lote, p.fecha_ejec, ahora, usuario.id,
            p.evidencia_url, p.evidencia_url_2 || null, p.evidencia_url_3 || null, p.observaciones || null,
          ]
        );
        const newDetId = inserted[0].id;

        await client.query(
          `INSERT INTO historial_registros (registro_det_id, estado_id, fecha, usuario_id_verif)
           VALUES ($1,5,$2,$3)`,
          [newDetId, ahora, usuario.id]
        );

        creados.push(newDetId);
      }

      await client.query("COMMIT");
      res.status(201).json({ creados, total: creados.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/registros/:id — Corregir detalle rechazado (id = registros_det.id)
router.put(
  "/:id",
  auth,
  [
    body("evidencia_url").notEmpty(),
    body("fecha_ejec").isDate(),
    body("manzana").notEmpty().trim(),
    body("lote").notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Cargar detalle + header juntos
      const { rows } = await client.query(
        `SELECT det.*,
                reg.id          AS reg_id,
                reg.tipo_registro_id,
                reg.modalidad_id AS reg_modalidad_id,
                reg.titular      AS reg_titular,
                reg.ci           AS reg_ci,
                reg.celular      AS reg_celular
         FROM registros_det det
         JOIN registros reg ON reg.id = det.registro_id
         WHERE det.id = $1`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      const det = rows[0];

      const esRolPrivilegiado = [1, 3, 5].includes(req.usuario.rol_id);
      if (det.usuario_id_carga !== req.usuario.id && !esRolPrivilegiado) {
        return res.status(403).json({ error: "Solo el usuario que cargó el registro puede corregirlo." });
      }

      const {
        tipo, modalidad_id, titular, ci, celular,
        manzana, lote, fecha_ejec,
        evidencia_url, evidencia_url_2, evidencia_url_3, observaciones,
      } = req.body;

      const tipoId = tipo ? TIPO_IDS[tipo] : det.tipo_registro_id;
      const ahora  = new Date().toISOString();
      // Si era rechazado → reenviar a validación (pendiente); si no, mantener estado
      const nuevoEstado = det.estado_id === 3 ? 5 : det.estado_id;

      // Actualizar header si cambian datos del beneficiario
      if (titular !== undefined || ci !== undefined || celular !== undefined ||
          modalidad_id !== undefined || tipo !== undefined) {
        await client.query(
          `UPDATE registros SET
             titular          = COALESCE($1, titular),
             ci               = COALESCE($2, ci),
             celular          = COALESCE($3, celular),
             modalidad_id     = COALESCE($4, modalidad_id),
             tipo_registro_id = $5
           WHERE id = $6`,
          [
            titular   || null,
            ci        || null,
            celular   ?? null,
            modalidad_id ? Number(modalidad_id) : null,
            tipoId,
            det.reg_id,
          ]
        );
      }

      // Actualizar detalle (registros_det)
      await client.query(
        `UPDATE registros_det SET
           manzana       = $1,  lote          = $2,
           fecha_ejec    = $3,
           evidencia_url = $4,  evidencia_url_2 = $5, evidencia_url_3 = $6,
           observaciones = $7,  estado_id = $8, updated_at = $9
         WHERE id = $10`,
        [
          manzana      || det.manzana,
          lote         || det.lote,
          fecha_ejec,
          evidencia_url,
          evidencia_url_2  || null,
          evidencia_url_3  || null,
          observaciones    ?? det.observaciones,
          nuevoEstado,
          ahora,
          det.id,
        ]
      );

      await client.query(
        `INSERT INTO historial_registros (registro_det_id, estado_id, fecha, usuario_id_verif)
         VALUES ($1,$2,$3,$4)`,
        [det.id, nuevoEstado, ahora, req.usuario.id]
      );

      await client.query("COMMIT");
      const updated = await cargarDetalle(client, det.id);
      res.json(updated);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// ─── PATCH /api/registros/:id/validar (id = registros_det.id) ─────────────────
router.patch("/:id/validar", auth, requireRolId(1, 5), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT estado_id FROM registros_det WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
    if (rows[0].estado_id !== 5) return res.status(400).json({ error: "Solo se pueden validar registros pendientes." });

    const ahora      = new Date().toISOString();
    const comentario = req.body.comentario || null;

    await client.query(
      `UPDATE registros_det SET estado_id=4, updated_at=$1 WHERE id=$2`,
      [ahora, req.params.id]
    );
    await client.query(
      `INSERT INTO historial_registros (registro_det_id, estado_id, fecha, usuario_id_verif, comentario)
       VALUES ($1,4,$2,$3,$4)`,
      [req.params.id, ahora, req.usuario.id, comentario]
    );

    await client.query("COMMIT");
    const reg = await cargarDetalle(client, req.params.id);
    res.json(reg);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── PATCH /api/registros/:id/rechazar (id = registros_det.id) ────────────────
router.patch(
  "/:id/rechazar",
  auth,
  requireRolId(1, 5),
  [body("comentario").notEmpty().withMessage("El motivo de rechazo es obligatorio.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT estado_id FROM registros_det WHERE id = $1`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Registro no encontrado." });
      if (rows[0].estado_id !== 5) return res.status(400).json({ error: "Solo se pueden rechazar registros pendientes." });

      const ahora = new Date().toISOString();

      await client.query(
        `UPDATE registros_det SET estado_id=3, updated_at=$1 WHERE id=$2`,
        [ahora, req.params.id]
      );
      await client.query(
        `INSERT INTO historial_registros (registro_det_id, estado_id, fecha, usuario_id_verif, comentario)
         VALUES ($1,3,$2,$3,$4)`,
        [req.params.id, ahora, req.usuario.id, req.body.comentario]
      );

      await client.query("COMMIT");
      const reg = await cargarDetalle(client, req.params.id);
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
