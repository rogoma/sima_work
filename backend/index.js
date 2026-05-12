require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes        = require("./src/routes/auth");
const registrosRoutes   = require("./src/routes/registros");
const localidadesRoutes = require("./src/routes/localidades");
const usuariosRoutes    = require("./src/routes/usuarios");
const evidenciaRoutes   = require("./src/routes/evidencia");
const modalidadesRoutes = require("./src/routes/modalidades");
const rolesRoutes       = require("./src/routes/roles");

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5174",
  credentials: true,
}));

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ARCHIVOS ESTÁTICOS (evidencias subidas) ───────────────────────────────────
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "./uploads")));

// ─── DOCUMENTOS (manuales, etc.) ──────────────────────────────────────────────
app.use("/documents", express.static(path.resolve(__dirname, "./documents")));

// ─── RUTAS ─────────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/registros",   registrosRoutes);
app.use("/api/localidades", localidadesRoutes);
app.use("/api/usuarios",    usuariosRoutes);
app.use("/api/evidencia",   evidenciaRoutes);
app.use("/api/modalidades", modalidadesRoutes);
app.use("/api/roles",       rolesRoutes);

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// ─── SERVIR FRONTEND EN PRODUCCIÓN ─────────────────────────────────────────
const frontendPath = path.resolve(__dirname, "../dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ─── MANEJO DE ERRORES GLOBAL ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor." });
});

// ─── INICIO ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 SIMSAS Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB: ${process.env.DATABASE_URL?.split("@")[1] || "no configurada"}\n`);
});
