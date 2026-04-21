/**
 * Seed inicial — carga los datos de demostración en la nueva estructura de BD.
 * Ejecutar: npm run seed
 */
const bcrypt = require("bcryptjs");
const pool = require("./pool");

// ─── DATOS DE REFERENCIA ──────────────────────────────────────────────────────

const roles = [
  { id: 1, nombre: "contratista" },
  { id: 2, nombre: "coordinador" },
  { id: 3, nombre: "equipo" },
  { id: 4, nombre: "junta" },
];

const localidades = [
  { id: 1, nombre: "Yaguarón",       previstas: 1100, conectados: 400, adecuaciones: 150, ci: 1013 },
  { id: 2, nombre: "Pirayú",         previstas: 1900, conectados: 79,  adecuaciones: 85,  ci: 1571 },
  { id: 3, nombre: "Yhú",            previstas: 807,  conectados: 54,  adecuaciones: 217, ci: 810  },
  { id: 4, nombre: "Choré",          previstas: 665,  conectados: 100, adecuaciones: 164, ci: 889  },
  { id: 5, nombre: "Yby Yaú",        previstas: 700,  conectados: 30,  adecuaciones: 125, ci: 931  },
  { id: 6, nombre: "Fram",           previstas: 1320, conectados: 0,   adecuaciones: 510, ci: 1160 },
  { id: 7, nombre: "Capitán Miranda",previstas: 1130, conectados: 40,  adecuaciones: 159, ci: 1401 },
];

const modalidades = [
  { id: 1,  nombre: "Gestión directa de la Junta",            cat: "JUNTA",       roles: [2, 4] },
  { id: 2,  nombre: "Llave en Mano — Hogares vulnerables",    cat: "CONTRATISTA", roles: [1, 2] },
  { id: 3,  nombre: "Autoconstrucción por Ayuda Mutua",       cat: "ICARO",       roles: [2, 3, 4] },
  { id: 4,  nombre: "Liderazgo Multinivel (8% referentes)",   cat: "ICARO",       roles: [2, 3, 4] },
  { id: 5,  nombre: "Liderazgo Manzanal Influencer",          cat: "ICARO",       roles: [2, 3, 4] },
  { id: 6,  nombre: "Red de Albañiles/Plomeros Certificados", cat: "ICARO",       roles: [2, 3, 4] },
  { id: 7,  nombre: "Servicio Tercerizado de Albañiles",      cat: "ICARO",       roles: [2, 3, 4] },
  { id: 8,  nombre: "Articulación de Insumos / LAZOS II",     cat: "ICARO",       roles: [2, 3, 4] },
  { id: 9,  nombre: "Productos Financieros (Juntas)",         cat: "ICARO",       roles: [2, 3, 4] },
  { id: 10, nombre: "USB por Componentes (Sinérgica)",        cat: "ICARO",       roles: [2, 3, 4] },
  { id: 11, nombre: "Info Hogares Triple A (Hazlo tú mismo)", cat: "ICARO",       roles: [2, 3, 4] },
  { id: 12, nombre: "Derecho de Conexión Diferido (6 meses)", cat: "ICARO",       roles: [2, 3, 4] },
];

const usuarios = [
  { id: 1, user: "contrat1",   nombre: "TECSUL S.A.",          rol_id: 1, localidades: [1, 2, 3], pass: "cont123" },
  { id: 2, user: "coord1",     nombre: "Coord. DASOC",         rol_id: 2, localidades: null,      pass: "coord123" },
  { id: 3, user: "equipo1",    nombre: "Equipo Social DASOC",  rol_id: 3, localidades: null,      pass: "equipo123" },
  { id: 4, user: "j_pirayu",   nombre: "Junta Pirayú",         rol_id: 4, localidades: [2],       pass: "junta456" },
  { id: 5, user: "j_yaguaron", nombre: "Junta Yaguarón",       rol_id: 4, localidades: [1],       pass: "junta123" },
];

const registros_init = [
  { id: "REG-0001", localidad_id: 1, tipo: "conectado",  modalidad_id: 1,  titular: "Juan Ramírez",    ci: "3456789", celular: "0981-123456", manzana: "12", lote: "05", fechaEjec: "2026-02-15", estado: "validado",  cargadoPor: 5, evidencia: "/uploads/foto_01.jpg", obs: "Conexión completa",
    historial: [
      { estado: "pendiente", fecha: "2026-02-16T10:30:00", por: 5 },
      { estado: "validado",  fecha: "2026-02-17T09:15:00", por: 2, comentario: "Conexión verificada. Empalme visible en foto." }
    ]
  },
  { id: "REG-0002", localidad_id: 2, tipo: "conectado",  modalidad_id: 2,  titular: "Rosa Fernández",  ci: "4567890", celular: "0985-234567", manzana: "03", lote: "12", fechaEjec: "2026-02-20", estado: "pendiente", cargadoPor: 1, evidencia: "/uploads/acta_02.pdf",  obs: "",
    historial: [{ estado: "pendiente", fecha: "2026-02-21T14:00:00", por: 1 }]
  },
  { id: "REG-0003", localidad_id: 3, tipo: "adecuacion", modalidad_id: 3,  titular: "Carlos López",    ci: "5678901", celular: "",             manzana: "07", lote: "22", fechaEjec: "2026-02-25", estado: "rechazado", cargadoPor: 3, evidencia: "/uploads/foto_03.jpg",  obs: "",
    historial: [
      { estado: "pendiente", fecha: "2026-02-25T16:45:00", por: 3 },
      { estado: "rechazado", fecha: "2026-02-26T11:00:00", por: 2, comentario: "La foto no muestra el interior de la instalación. Reenviar con imagen del baño y cañerías." }
    ]
  },
  { id: "REG-0004", localidad_id: 1, tipo: "adecuacion", modalidad_id: 4,  titular: "Elena Torres",    ci: "6789012", celular: "0991-345678", manzana: "15", lote: "08", fechaEjec: "2026-03-01", estado: "pendiente", cargadoPor: 3, evidencia: "/uploads/foto_04.jpg",  obs: "",
    historial: [{ estado: "pendiente", fecha: "2026-03-02T09:00:00", por: 3 }]
  },
  { id: "REG-0005", localidad_id: 4, tipo: "conectado",  modalidad_id: 1,  titular: "Miguel Sosa",     ci: "7890123", celular: "0982-456789", manzana: "02", lote: "31", fechaEjec: "2026-03-05", estado: "validado",  cargadoPor: 3, evidencia: "/uploads/foto_05.jpg",  obs: "",
    historial: [
      { estado: "pendiente", fecha: "2026-03-06T08:30:00", por: 3 },
      { estado: "validado",  fecha: "2026-03-07T10:00:00", por: 2, comentario: "Correcto." }
    ]
  },
  { id: "REG-0006", localidad_id: 6, tipo: "conectado",  modalidad_id: 2,  titular: "Patricia Núñez",  ci: "8901234", celular: "0983-567890", manzana: "05", lote: "17", fechaEjec: "2026-03-08", estado: "validado",  cargadoPor: 1, evidencia: "/uploads/foto_06.jpg",  obs: "Hogar vulnerable certificado",
    historial: [
      { estado: "pendiente", fecha: "2026-03-09T11:00:00", por: 1 },
      { estado: "validado",  fecha: "2026-03-30T10:31:19", por: 2, comentario: "Todo ok" }
    ]
  },
  { id: "REG-0007", localidad_id: 7, tipo: "conectado",  modalidad_id: 9,  titular: "Mia Roa",         ci: "7901234", celular: "0985421544",  manzana: "10", lote: "02", fechaEjec: "2026-03-24", estado: "validado",  cargadoPor: 2, evidencia: "/uploads/1774373644626-h5cyefm0c5v.png",  obs: null,
    historial: [
      { estado: "pendiente", fecha: "2026-03-24T17:34:10", por: 2 },
      { estado: "validado",  fecha: "2026-03-25T17:32:45", por: 2, comentario: "Todo ok" }
    ]
  },
];

// ─── EJECUCIÓN ─────────────────────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Roles
    for (const r of roles) {
      await client.query(
        `INSERT INTO roles (id, nombre) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.nombre]
      );
    }
    await client.query(`SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))`);
    console.log("✅ Roles insertados.");

    // Localidades
    for (const loc of localidades) {
      await client.query(
        `INSERT INTO localidades (id, nombre, previstas, conectados, adecuaciones, ci)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [loc.id, loc.nombre, loc.previstas, loc.conectados, loc.adecuaciones, loc.ci]
      );
    }
    await client.query(`SELECT setval('localities_id_seq', (SELECT MAX(id) FROM localidades))`);
    console.log("✅ Localidades insertadas.");

    // Modalidades
    for (const mod of modalidades) {
      await client.query(
        `INSERT INTO modalidades (id, nombre, cat) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
        [mod.id, mod.nombre, mod.cat]
      );
      for (const rolId of mod.roles) {
        await client.query(
          `INSERT INTO modalidad_roles (modalidad_id, rol_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [mod.id, rolId]
        );
      }
    }
    await client.query(`SELECT setval('modalities_id_seq', (SELECT MAX(id) FROM modalidades))`);
    console.log("✅ Modalidades insertadas.");

    // Usuarios
    for (const u of usuarios) {
      const hash = await bcrypt.hash(u.pass, 10);
      await client.query(
        `INSERT INTO usuarios (id, "user", nombre, rol_id, password_hash)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.user, u.nombre, u.rol_id, hash]
      );
      if (u.localidades) {
        for (const locId of u.localidades) {
          await client.query(
            `INSERT INTO usuario_localidades (usuario_id, localidad_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [u.id, locId]
          );
        }
      }
    }
    await client.query(`SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios))`);
    console.log("✅ Usuarios insertados.");

    // Registros + historial
    for (const reg of registros_init) {
      const num = parseInt(reg.id.split("-")[1]);
      await client.query(`SELECT setval('registros_seq', GREATEST(nextval('registros_seq')-1, $1))`, [num]);

      await client.query(
        `INSERT INTO registros
           (id, localidad_id, tipo, modalidad_id, titular, ci, celular, manzana, lote,
            fecha_ejec, fecha_carga, estado, cargado_por, evidencia_url, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          reg.id, reg.localidad_id, reg.tipo, reg.modalidad_id, reg.titular,
          reg.ci, reg.celular || null, reg.manzana, reg.lote, reg.fechaEjec,
          reg.historial[0].fecha, reg.estado, reg.cargadoPor,
          reg.evidencia || null, reg.obs || null,
        ]
      );

      for (const h of reg.historial) {
        await client.query(
          `INSERT INTO historial_registros (registro_id, estado, fecha, por, comentario)
           VALUES ($1,$2,$3,$4,$5)`,
          [reg.id, h.estado, h.fecha, h.por, h.comentario || null]
        );
      }
    }
    console.log("✅ Registros e historial insertados.");

    await client.query("COMMIT");
    console.log("\n🎉 Seed completado exitosamente.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en seed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
