import React, { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../styles/colors";
import { useMobile } from "../hooks/useMobile";
import { fetchDocumentos, subirDocumento, eliminarDocumento } from "../services/api";

export default function Sidebar({ usuario, vista, setVista, pendientes, localidades, isOpen, onClose }) {
  const isMobile = useMobile();
  const [adminExpanded, setAdminExpanded] = useState(
    () => vista === "admin" || vista === "roles"
  );
  const [registrosExpanded, setRegistrosExpanded] = useState(
    () => vista === "registros" || vista === "nuevo" || vista === "validacion"
  );
  const [docsExpanded, setDocsExpanded] = useState(false);

  // ── Estado de documentos ────────────────────────────────────────────────────
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null); // { tipo: "ok"|"err", texto }
  const [confirmDelete, setConfirmDelete] = useState(null); // nombre del archivo a confirmar
  const fileInputRef = useRef(null);

  const esCoordinador = [1, 5].includes(usuario.rol_id);

  // ── Carga documentos desde el servidor ──────────────────────────────────────
  const cargarDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const data = await fetchDocumentos();
      setDocs(data);
    } catch {
      // silencioso; la lista quedará vacía
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (docsExpanded) {
      setUploadMsg(null);
      cargarDocs();
    }
  }, [docsExpanded, cargarDocs]);

  // ── Manejo de selección de archivo ──────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // reset para permitir subir el mismo nombre si se corrigió
    if (!file) return;

    setUploadMsg(null);

    // Validar tipo PDF en el cliente
    const esPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!esPdf) {
      setUploadMsg({ tipo: "err", texto: "Solo se permiten archivos PDF." });
      return;
    }

    // Validar tamaño (20 MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadMsg({ tipo: "err", texto: "El archivo supera el límite de 20 MB." });
      return;
    }

    setUploading(true);
    try {
      await subirDocumento(file);
      setUploadMsg({ tipo: "ok", texto: "Documento subido correctamente." });
      await cargarDocs();
    } catch (err) {
      setUploadMsg({
        tipo: "err",
        texto: err.error || "Error al subir el documento.",
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Eliminar documento ───────────────────────────────────────────────────────
  const handleEliminar = async (nombre) => {
    try {
      await eliminarDocumento(nombre);
      setConfirmDelete(null);
      await cargarDocs();
    } catch (err) {
      setUploadMsg({
        tipo: "err",
        texto: err.error || "Error al eliminar el documento.",
      });
      setConfirmDelete(null);
    }
  };

  const items = [
    { id: "dashboard", icon: "📊", label: "Tablero" },
    ...([1, 3, 5, 6].includes(usuario.rol_id) ? [{ id: "linea", icon: "📈", label: "Línea de Avance" }] : []),
  ];

  const registrosSubitems = [
    { id: "registros", icon: "📋", label: "Lista de Registros" },
    { id: "nuevo", icon: "➕", label: "Nuevo Registro" },
    ...(esCoordinador ? [{ id: "validacion", icon: "✅", label: "Validación", badge: pendientes }] : []),
  ];

  const adminSubitems = [
    { id: "admin",  icon: "✅", label: "Metas/Estrategias" },
    { id: "admin",  icon: "⚙️", label: "Usuarios" },
    { id: "roles",  icon: "🔑", label: "Roles" },
  ];

  const isAdminActive = vista === "admin" || vista === "roles";

  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

  const navItemStyle = (active) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 22px",
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: "none",
    cursor: "pointer",
    color: active ? C.blanco : "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    textAlign: "left",
    borderLeft: active ? `3px solid ${C.blanco}` : "3px solid transparent",
    transition: "all 0.15s",
    letterSpacing: "-0.01em",
  });

  const subItemStyle = (active) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 22px 10px 38px",
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: "none",
    cursor: "pointer",
    color: active ? C.blanco : "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    textAlign: "left",
    borderLeft: active ? `3px solid rgba(255,255,255,0.7)` : "3px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99, backdropFilter: "blur(2px)" }}
        />
      )}
      <div style={{
        width: 230,
        background: `linear-gradient(180deg,#4A0072 0%,#7B2FBE 100%)`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
        boxShadow: "3px 0 24px rgba(0,0,0,0.15)",
        transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{ padding: "22px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="Logo_Senasa.jpg" alt="Logo Senasa" style={{ height: 50, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: C.blanco, letterSpacing: "-0.02em" }}>SIMA</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Monitor Social · Alcantarillado</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blanco, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{usuario.rol}</div>
          {usuario.localidades && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
              📍 {usuario.localidades.map((id) => locNombre(id)).join(", ")}
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "10px 0", overflow: "auto" }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setVista(item.id)}
              style={navItemStyle(vista === item.id)}
              onMouseEnter={(e) => { if (vista !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { if (vista !== item.id) e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: C.rojo, color: C.blanco, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, animation: "pulse 2s infinite" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Sección Registros */}
          {(() => {
            const isRegistrosActive = vista === "registros" || vista === "nuevo" || vista === "validacion";
            return (
              <>
                <button
                  onClick={() => setRegistrosExpanded((v) => !v)}
                  style={{
                    ...navItemStyle(isRegistrosActive && !registrosExpanded),
                    background: isRegistrosActive ? "rgba(255,255,255,0.10)" : "none",
                    borderLeft: isRegistrosActive ? `3px solid rgba(255,255,255,0.5)` : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isRegistrosActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={(e) => { if (!isRegistrosActive) e.currentTarget.style.background = isRegistrosActive ? "rgba(255,255,255,0.10)" : "none"; }}
                >
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span style={{ flex: 1 }}>Registros</span>
                  <span style={{ fontSize: 10, opacity: 0.7, transition: "transform 0.2s", display: "inline-block", transform: registrosExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    ▶
                  </span>
                </button>
                {registrosExpanded && (
                  <div style={{ overflow: "hidden" }}>
                    {registrosSubitems.map((item) => (
                      <button
                        key={item.id + item.label}
                        onClick={() => setVista(item.id)}
                        style={subItemStyle(vista === item.id)}
                        onMouseEnter={(e) => { if (vista !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                        onMouseLeave={(e) => { if (vista !== item.id) e.currentTarget.style.background = "none"; }}
                      >
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge > 0 && (
                          <span style={{ background: C.rojo, color: C.blanco, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, animation: "pulse 2s infinite" }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Reportes */}
          {esCoordinador && (
            <button
              onClick={() => setVista("reportes")}
              style={navItemStyle(vista === "reportes")}
              onMouseEnter={(e) => { if (vista !== "reportes") e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { if (vista !== "reportes") e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>📑</span>
              <span style={{ flex: 1 }}>Reportes</span>
            </button>
          )}

          {/* Sección Administración (solo coordinador) */}
          {esCoordinador && (
            <>
              <button
                onClick={() => setAdminExpanded((v) => !v)}
                style={{
                  ...navItemStyle(isAdminActive && !adminExpanded),
                  background: isAdminActive ? "rgba(255,255,255,0.10)" : "none",
                  borderLeft: isAdminActive ? `3px solid rgba(255,255,255,0.5)` : "3px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isAdminActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { if (!isAdminActive) e.currentTarget.style.background = isAdminActive ? "rgba(255,255,255,0.10)" : "none"; }}
              >
                <span style={{ fontSize: 16 }}>⚙️</span>
                <span style={{ flex: 1 }}>Administración</span>
                <span style={{ fontSize: 10, opacity: 0.7, transition: "transform 0.2s", display: "inline-block", transform: adminExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                  ▶
                </span>
              </button>
              {adminExpanded && (
                <div style={{ overflow: "hidden" }}>
                  {adminSubitems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVista(item.id)}
                      style={subItemStyle(vista === item.id)}
                      onMouseEnter={(e) => { if (vista !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={(e) => { if (vista !== item.id) e.currentTarget.style.background = "none"; }}
                    >
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Sección Documentos ─────────────────────────────────────────── */}
          <>
            {/* Input oculto para selección de archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {/* Header colapsable */}
            <button
              onClick={() => setDocsExpanded((v) => !v)}
              style={{
                ...navItemStyle(false),
                background: "none",
                borderLeft: "3px solid transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>📁</span>
              <span style={{ flex: 1 }}>Documentos</span>
              <span style={{ fontSize: 10, opacity: 0.7, transition: "transform 0.2s", display: "inline-block", transform: docsExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                ▶
              </span>
            </button>

            {docsExpanded && (
              <div style={{ overflow: "hidden" }}>

                {/* Botón "Agregar PDF" solo para coordinadores */}
                {esCoordinador && (
                  <div style={{ padding: "6px 22px 6px 38px" }}>
                    <button
                      onClick={() => { setUploadMsg(null); fileInputRef.current?.click(); }}
                      disabled={uploading}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "7px 10px",
                        background: uploading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
                        border: "1px dashed rgba(255,255,255,0.4)",
                        borderRadius: 6,
                        cursor: uploading ? "not-allowed" : "pointer",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: 11,
                        fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
                      onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                    >
                      {uploading ? (
                        <>
                          <span style={{ fontSize: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                          Subiendo…
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 14, fontWeight: 900 }}>＋</span>
                          Agregar PDF
                        </>
                      )}
                    </button>

                    {/* Mensaje de resultado */}
                    {uploadMsg && (
                      <div style={{
                        marginTop: 5,
                        padding: "5px 8px",
                        borderRadius: 5,
                        fontSize: 10,
                        lineHeight: 1.4,
                        background: uploadMsg.tipo === "ok"
                          ? "rgba(72,199,116,0.18)"
                          : "rgba(255,80,80,0.18)",
                        color: uploadMsg.tipo === "ok"
                          ? "#a8f0c6"
                          : "#ffaaaa",
                        border: `1px solid ${uploadMsg.tipo === "ok" ? "rgba(72,199,116,0.35)" : "rgba(255,80,80,0.35)"}`,
                      }}>
                        {uploadMsg.tipo === "ok" ? "✔ " : "✖ "}{uploadMsg.texto}
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de documentos */}
                {docsLoading ? (
                  <div style={{ padding: "8px 38px", fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
                    Cargando…
                  </div>
                ) : docs.length === 0 ? (
                  <div style={{ padding: "8px 38px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                    Sin documentos
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div key={doc.nombre} style={{ position: "relative" }}>
                      {/* Confirmación de eliminación */}
                      {confirmDelete === doc.nombre ? (
                        <div style={{
                          padding: "8px 22px 8px 38px",
                          background: "rgba(255,80,80,0.13)",
                          borderLeft: "3px solid rgba(255,80,80,0.5)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}>
                          <span style={{ fontSize: 10, color: "#ffaaaa" }}>¿Eliminar "{doc.nombre}"?</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => handleEliminar(doc.nombre)}
                              style={{
                                flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700,
                                background: "rgba(255,80,80,0.3)", border: "1px solid rgba(255,80,80,0.5)",
                                borderRadius: 4, color: "#ffcccc", cursor: "pointer",
                              }}
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{
                                flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700,
                                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: 4, color: "rgba(255,255,255,0.7)", cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <a
                            href={doc.url}
                            download={doc.nombre}
                            title={`Descargar: ${doc.nombre}`}
                            style={{
                              ...subItemStyle(false),
                              flex: 1,
                              display: "flex",
                              textDecoration: "none",
                              overflow: "hidden",
                              paddingRight: esCoordinador ? 6 : 22,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                          >
                            <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                            <span style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 11,
                            }}>
                              {doc.nombre.replace(/\.pdf$/i, "")}
                            </span>
                          </a>
                          {/* Botón eliminar (solo coordinadores) */}
                          {esCoordinador && (
                            <button
                              onClick={() => { setUploadMsg(null); setConfirmDelete(doc.nombre); }}
                              title="Eliminar documento"
                              style={{
                                flexShrink: 0,
                                width: 22,
                                height: 22,
                                marginRight: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "transparent",
                                border: "none",
                                borderRadius: 4,
                                color: "rgba(255,255,255,0.3)",
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s",
                                padding: 0,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255,80,80,0.2)";
                                e.currentTarget.style.color = "#ffaaaa";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        </nav>
      </div>
    </>
  );
}
