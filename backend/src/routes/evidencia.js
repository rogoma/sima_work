const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const MAX_SIZE_BYTES = (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, nombre);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF."));
    }
  },
});

// ─── POST /api/evidencia/upload ────────────────────────────────────────────────
router.post("/upload", auth, upload.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió ningún archivo." });
  }

  // Devuelve la URL relativa que se guarda en la BD
  const url = `/uploads/${req.file.filename}`;
  res.json({
    url,
    nombre_original: req.file.originalname,
    tamanio_bytes: req.file.size,
    tipo: req.file.mimetype,
  });
});

// ─── Manejo de errores de multer ───────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: `El archivo supera el tamaño máximo permitido (${process.env.MAX_FILE_SIZE_MB || 10} MB).`,
    });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;
