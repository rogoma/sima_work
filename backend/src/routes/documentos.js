const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");
const { requireRolId } = require("../middlewares/roles");

const DOCS_DIR = path.resolve(__dirname, "../../documents");
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── Carpetas por localidad ────────────────────────────────────────────────────
const CARPETAS = [
  { nombre: "Fram",         localidad_id: 6 },
  { nombre: "Cptan_Miranda", localidad_id: 7 },
];

// Asegurar que el directorio raíz y los subdirectorios de carpetas existen
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
CARPETAS.forEach(({ nombre }) => {
  const dir = path.join(DOCS_DIR, nombre);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Usamos memoryStorage para poder verificar duplicados antes de escribir el disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const esPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";
    if (esPdf) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF."));
    }
  },
});

// ─── Sanitiza el nombre: conserva letras, dígitos, puntos, guiones y espacios ──
function sanitizarNombre(original) {
  return original.replace(/[^a-zA-Z0-9._\-\sáéíóúÁÉÍÓÚñÑüÜ]/g, "_").trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function listarPdfsDeDir(dir, urlBase) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => {
      const stats = fs.statSync(path.join(dir, f));
      return {
        nombre: f,
        url: `${urlBase}/${encodeURIComponent(f)}`,
        tamanio: stats.size,
        fecha: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ─── GET /api/documentos — Lista todos los PDFs raíz (excluye subdirectorios) ─
router.get("/", auth, (_req, res) => {
  try {
    const archivos = fs
      .readdirSync(DOCS_DIR)
      .filter((f) => {
        const fullPath = path.join(DOCS_DIR, f);
        return (
          fs.statSync(fullPath).isFile() &&
          f.toLowerCase().endsWith(".pdf")
        );
      })
      .map((f) => {
        const stats = fs.statSync(path.join(DOCS_DIR, f));
        return {
          nombre: f,
          url: `/documents/${encodeURIComponent(f)}`,
          tamanio: stats.size,
          fecha: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    res.json(archivos);
  } catch (err) {
    console.error("Error listando documentos:", err);
    res.status(500).json({ error: "No se pudo listar los documentos." });
  }
});

// ─── GET /api/documentos/carpetas — Carpetas visibles según localidades del usuario ─
router.get("/carpetas", auth, (req, res) => {
  try {
    const localidades = (req.usuario.localidades || []).map(Number);
    const carpetasAccesibles = CARPETAS.filter((c) =>
      localidades.includes(c.localidad_id)
    );

    const resultado = carpetasAccesibles.map(({ nombre, localidad_id }) => {
      const dir = path.join(DOCS_DIR, nombre);
      const docs = listarPdfsDeDir(dir, `/documents/${encodeURIComponent(nombre)}`);
      return { nombre, localidad_id, docs };
    });

    res.json(resultado);
  } catch (err) {
    console.error("Error listando carpetas:", err);
    res.status(500).json({ error: "No se pudo listar las carpetas." });
  }
});

// ─── POST /api/documentos/upload — Subir PDF general (solo coordinadores) ──────
router.post(
  "/upload",
  auth,
  requireRolId(1, 5),
  upload.single("archivo"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    const nombre = sanitizarNombre(req.file.originalname);

    if (!nombre.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "Solo se permiten archivos PDF." });
    }

    const destino = path.join(DOCS_DIR, nombre);

    if (fs.existsSync(destino)) {
      return res.status(409).json({
        error: `Ya existe un documento con el nombre "${nombre}". Cambie el nombre del archivo e intente nuevamente.`,
        codigo: "DUPLICADO",
      });
    }

    try {
      fs.writeFileSync(destino, req.file.buffer);
    } catch (err) {
      console.error("Error escribiendo documento:", err);
      return res.status(500).json({ error: "No se pudo guardar el archivo." });
    }

    res.status(201).json({
      nombre,
      url: `/documents/${encodeURIComponent(nombre)}`,
      tamanio: req.file.size,
    });
  }
);

// ─── POST /api/documentos/carpetas/:carpeta/upload — Subir PDF a carpeta ────────
router.post(
  "/carpetas/:carpeta/upload",
  auth,
  requireRolId(1, 5),
  upload.single("archivo"),
  (req, res) => {
    const { carpeta } = req.params;
    const carpetaConfig = CARPETAS.find((c) => c.nombre === carpeta);

    if (!carpetaConfig) {
      return res.status(404).json({ error: "Carpeta no encontrada." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    const nombre = sanitizarNombre(req.file.originalname);

    if (!nombre.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "Solo se permiten archivos PDF." });
    }

    const dir = path.join(DOCS_DIR, carpeta);
    const destino = path.join(dir, nombre);

    if (fs.existsSync(destino)) {
      return res.status(409).json({
        error: `Ya existe un documento con el nombre "${nombre}". Cambie el nombre del archivo e intente nuevamente.`,
        codigo: "DUPLICADO",
      });
    }

    try {
      fs.writeFileSync(destino, req.file.buffer);
    } catch (err) {
      console.error("Error escribiendo documento en carpeta:", err);
      return res.status(500).json({ error: "No se pudo guardar el archivo." });
    }

    res.status(201).json({
      nombre,
      url: `/documents/${encodeURIComponent(carpeta)}/${encodeURIComponent(nombre)}`,
      tamanio: req.file.size,
    });
  }
);

// ─── DELETE /api/documentos/:filename — Eliminar PDF general (solo coordinadores) ─
router.delete("/:filename", auth, requireRolId(1, 5), (req, res) => {
  const nombre = req.params.filename;

  if (
    nombre.includes("..") ||
    nombre.includes("/") ||
    nombre.includes("\\")
  ) {
    return res.status(400).json({ error: "Nombre de archivo inválido." });
  }

  const filePath = path.join(DOCS_DIR, nombre);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Archivo no encontrado." });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando documento:", err);
    res.status(500).json({ error: "No se pudo eliminar el archivo." });
  }
});

// ─── DELETE /api/documentos/carpetas/:carpeta/:filename — Eliminar PDF de carpeta ─
router.delete("/carpetas/:carpeta/:filename", auth, requireRolId(1, 5), (req, res) => {
  const { carpeta, filename } = req.params;

  const carpetaConfig = CARPETAS.find((c) => c.nombre === carpeta);
  if (!carpetaConfig) {
    return res.status(404).json({ error: "Carpeta no encontrada." });
  }

  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return res.status(400).json({ error: "Nombre de archivo inválido." });
  }

  const filePath = path.join(DOCS_DIR, carpeta, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Archivo no encontrado." });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando documento de carpeta:", err);
    res.status(500).json({ error: "No se pudo eliminar el archivo." });
  }
});

// ─── Manejo de errores de multer ───────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "El archivo supera el límite de 20 MB." });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;
