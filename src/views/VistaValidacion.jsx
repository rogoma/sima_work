import React, { useState } from "react";
import { C } from "../styles/colors";
import { Badge, TipoBadge, CatBadge } from "../components/Badges";
import { Modal } from "../components/Overlays";
import { Campo, Textarea } from "../components/FormFields";
import TablaRegistros, { ModalDetalleRegistro } from "../components/TablaRegistros";
import { fmt } from "../services/helpers";

export default function VistaValidacion({ registros, onValidar, onRechazar, localidades, setVista }) {
  const pendientes = registros.filter((r) => r.estado === "pendiente");
  const [modalReg, setModalReg] = useState(null);
  const [accion, setAccion] = useState(null);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

  const confirmarAccion = async () => {
    if (accion === "rechazar" && !comentario.trim()) { setError("El motivo es obligatorio."); return; }
    setSubmitting(true);
    try {
      if (accion === "validar") await onValidar(modalReg.id, comentario);
      else await onRechazar(modalReg.id, comentario);
      setModalReg(null); setAccion(null); setComentario(""); setError("");
    } catch (e) { setError(e.error || "Error al procesar"); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>✅ Panel de Validación</h1>
          <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>Exclusivo para el Coordinador · DASOC</p>
        </div>
        {setVista && (
          <button
            onClick={() => setVista("dashboard")}
            style={{ padding: "10px 20px", background: `linear-gradient(135deg,${C.rojo},#991B1B)`, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(220,38,38,0.25)" }}
          >
            🏠 Volver al Dashboard
          </button>
        )}
      </div>

      {pendientes.length > 0 && (
        <div className="fade-in" style={{ background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "1px solid #FCD34D", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#92400E" }}>{pendientes.length} registro{pendientes.length !== 1 ? "s" : ""} con ACCIÓN REQUERIDA</div>
            <div style={{ fontSize: 13, color: "#B45309" }}>Revise evidencia antes de validar o rechazar.</div>
          </div>
        </div>
      )}

      {pendientes.length === 0 && (
        <div style={{ background: C.verdeC, border: "1px solid #6EE7B7", borderRadius: 14, padding: 32, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#065F46" }}>No hay registros pendientes</div>
        </div>
      )}

      {pendientes.map((r) => (
        <div key={r.id} className="fade-in" style={{ background: C.blanco, borderRadius: 14, border: `2px solid ${C.amarillo}`, padding: "20px", marginBottom: 14, boxShadow: "0 2px 10px rgba(217,119,6,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: C.azul, background: C.azulClaro, padding: "2px 8px", borderRadius: 6 }}>{r.id}</span>
                <Badge estado="pendiente" /><TipoBadge tipo={r.tipo} />{r.modalidad_cat && <CatBadge cat={r.modalidad_cat} />}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.texto, marginBottom: 4 }}>{r.titular} <span style={{ fontWeight: 400, color: C.grisTexto, fontSize: 13 }}>· CI {r.ci}</span></div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.grisTexto }}>
                <span>📍 {r.localidad_nombre || locNombre(r.localidad_id)} · Mz {r.manzana} · Lote {r.lote}</span>
                <span>📅 {fmt(r.fecha_ejec)}</span>
                <span>👤 {r.cargado_por_nombre || r.cargado_por}</span>
              </div>
              {r.modalidad_nombre && <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 4 }}>🔧 {r.modalidad_nombre}</div>}
              {r.evidencia_url && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, background: C.azulSuave, padding: "8px 12px", borderRadius: 10, width: "fit-content" }}>
                  {/* <span>{r.evidencia_url.endsWith(".pdf") ? "📄" : "🖼️"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.azul }}>{r.evidencia_url.split("/").pop()}</span> */}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
              <button onClick={() => { setModalReg(r); setAccion("validar"); setComentario(""); setError(""); }} style={{ padding: "10px 16px", background: `linear-gradient(135deg,${C.verde},#047857)`, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(5,150,105,0.2)" }}>✅ Validar</button>
              <button onClick={() => { setModalReg(r); setAccion("rechazar"); setComentario(""); setError(""); }} style={{ padding: "10px 16px", background: `linear-gradient(135deg,${C.rojo},#991B1B)`, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>❌ Rechazar</button>
              <button onClick={() => { setModalReg(r); setAccion("ver"); }} style={{ padding: "10px 16px", background: C.azul, color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Ver detalle</button>
            </div>
          </div>
        </div>
      ))}

      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden", marginTop: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}` }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Historial procesados</h3></div>
        <TablaRegistros registros={registros.filter((r) => r.estado !== "pendiente")} usuario={{ rol: "coordinador", id: 0 }} localidades={localidades} />
      </div>

      {modalReg && accion !== "ver" && (
        <Modal title={accion === "validar" ? "Confirmar Validación" : "Confirmar Rechazo"} onClose={() => { setModalReg(null); setAccion(null); }}>
          <div style={{ marginBottom: 16, padding: "12px 16px", background: accion === "validar" ? C.verdeC : C.rojoClaro, borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: accion === "validar" ? "#065F46" : C.rojo }}>{modalReg.id} · {modalReg.titular}</div>
            <div style={{ fontSize: 12, color: C.grisTexto, marginTop: 2 }}>{modalReg.localidad_nombre || locNombre(modalReg.localidad_id)} · <TipoBadge tipo={modalReg.tipo} /></div>
          </div>
          <Campo label={accion === "rechazar" ? "Motivo del rechazo (obligatorio)" : "Comentario (recomendado)"} required={accion === "rechazar"} error={error}>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder={accion === "rechazar" ? "Ej: Foto no muestra empalme..." : "Ej: Conexión verificada."} />
          </Campo>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setModalReg(null); setAccion(null); }} style={{ padding: "10px 20px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.grisTexto }}>Cancelar</button>
            <button onClick={confirmarAccion} disabled={submitting} style={{ padding: "10px 24px", background: accion === "validar" ? C.verde : C.rojo, color: C.blanco, border: "none", borderRadius: 10, cursor: submitting ? "wait" : "pointer", fontSize: 14, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Procesando..." : accion === "validar" ? "✅ Confirmar" : "❌ Confirmar rechazo"}</button>
          </div>
        </Modal>
      )}
      {modalReg && accion === "ver" && <ModalDetalleRegistro registro={modalReg} onClose={() => { setModalReg(null); setAccion(null); }} localidades={localidades} />}
    </div>
  );
}
