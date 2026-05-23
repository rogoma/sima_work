const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");
const { requireRolId } = require("../middlewares/roles");

const DOCS_DIR = path.resolve(__dirname, "../../documents");
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// Asegurar que el directorio existe
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

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

// ─── GET /api/documentos — Lista todos los PDFs del directorio ─────────────────
router.get("/", auth, (_req, res) => {
  try {
    const archivos = fs
      .readdirSync(DOCS_DIR)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
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

// ─── POST /api/documentos/upload — Subir PDF (solo coordinadores) ──────────────
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

    // Verificar que termine en .pdf (por si el sanitizador cambió algo)
    if (!nombre.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "Solo se permiten archivos PDF." });
    }

    const destino = path.join(DOCS_DIR, nombre);

    // Verificar duplicado
    if (fs.existsSync(destino)) {
      return res.status(409).json({
        error: `Ya existe un documento con el nombre "${nombre}". Cambie el nombre del archivo e intente nuevamente.`,
        codigo: "DUPLICADO",
      });
    }

    // Escribir al disco
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

// ─── DELETE /api/documentos/:filename — Eliminar PDF (solo coordinadores) ──────
router.delete("/:filename", auth, requireRolId(1, 5), (req, res) => {
  const nombre = req.params.filename;

  // Prevenir path traversal
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
