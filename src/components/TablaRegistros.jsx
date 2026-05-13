import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { Badge, TipoBadge, CatBadge } from "./Badges";
import { Modal } from "./Overlays";
import { fetchRegistro } from "../services/api";
import { fmt, fmtDT } from "../services/helpers";
const fmtNum = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
import { useMobile } from "../hooks/useMobile";

function EvidenciaIcons({ registro, size = 18 }) {
  const urls = [registro.evidencia_url, registro.evidencia_url_2, registro.evidencia_url_3].filter(Boolean);
  if (!urls.length) return <span style={{ color: C.grisTexto, fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {urls.map((url, idx) => (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" title={`Ver evidencia ${idx + 1}`}
          style={{ color: C.azul, display: "inline-flex", alignItems: "center" }}
          onClick={e => e.stopPropagation()}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </a>
      ))}
    </div>
  );
}

// ─── MODAL DETALLE ───────────────────────────────────────────────────────────
export function ModalDetalleRegistro({ registro: r, onClose, localidades = [] }) {
  const [fullReg, setFullReg] = useState(r);
  const isMobile = useMobile();
  useEffect(() => {
    fetchRegistro(r.id).then(setFullReg).catch(() => {});
  }, [r.id]);

  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

  return (
    <Modal title={`Detalle: ${fullReg.id}`} onClose={onClose} width={620}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          ["Localidad", fullReg.localidad_nombre || locNombre(fullReg.localidad_id)],
          ["Tipo", <TipoBadge tipo={fullReg.tipo} />],
          ["Titular", fullReg.titular],
          ["CI", fullReg.ci],
          ["Celular", fullReg.celular || "-"],
          ["Manzana / Lote", `${fullReg.manzana} / ${fullReg.lote}`],
          ["Estrategia", <>{fullReg.modalidad_cat && <CatBadge cat={fullReg.modalidad_cat} />} <span style={{ fontSize: 12, marginLeft: 4 }}>{fullReg.modalidad_nombre || fullReg.modalidad_id}</span></>],
          ["Estado", <Badge estado={fullReg.estado} />],
          ...(fullReg.estado === "rechazado"
            ? [["Motivo de Rechazo", (() => {
                const motivo = [...(fullReg.historial || [])].reverse().find(h => h.estado === "rechazado")?.comentario;
                return <span style={{ color: "#B91C1C", fontStyle: motivo ? "normal" : "italic" }}>{motivo || "Sin motivo especificado"}</span>;
              })()]]
            : []),
          ["Fecha Ejecución", fmt(fullReg.fecha_ejec)],
          ["Fecha Carga", fmtDT(fullReg.fecha_carga)],
          // ["Cargado por", fullReg.cargado_por_nombre || fullReg.cargado_por],
          (fullReg.evidencia_url || fullReg.evidencia_url_2 || fullReg.evidencia_url_3) && ["Evidencias",
            <EvidenciaIcons registro={fullReg} size={22} />
          ],
        ].filter(Boolean).map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.grisTexto, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ fontSize: 13, color: C.texto, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      {fullReg.observaciones && (
        <div style={{ padding: "12px 16px", background: C.gris, borderRadius: 10, marginBottom: 20, fontSize: 13, color: C.texto }}>
          <strong>Observaciones:</strong> {fullReg.observaciones}
        </div>
      )}
      {/* <div style={{ borderTop: `1px solid ${C.grisMedio}`, paddingTop: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: C.texto }}>Historial de estados</h4>
        {(fullReg.historial || []).map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, paddingLeft: 16, borderLeft: `2px solid ${h.estado === "validado" ? C.verde : h.estado === "rechazado" ? C.rojo : C.amarillo}` }}>
            <div>
              <Badge estado={h.estado} />
              <div style={{ fontSize: 11, color: C.grisTexto, marginTop: 4 }}>{fmtDT(h.fecha)} · {h.por_nombre || h.por}</div>
              {h.comentario && <div style={{ fontSize: 12, color: C.texto, marginTop: 4, fontStyle: "italic" }}>"{h.comentario}"</div>}
            </div>
          </div>
        ))}
      </div> */}
    </Modal>
  );
}

// ─── TABLA REGISTROS ─────────────────────────────────────────────────────────
export default function TablaRegistros({ registros, usuario, compact = false, onReabrir, onEditar, onEditarCarga, localidades = [] }) {
  const [detalle, setDetalle] = useState(null);
  const isMobile = useMobile();
  const locNombre = (id) => localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

  if (!registros.length) {
    return <div style={{ padding: 40, textAlign: "center", color: C.grisTexto, fontSize: 13 }}>No hay registros para mostrar.</div>;
  }

  // ─── Mobile card layout ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div>
          {registros.map((r, i) => (
            <div key={r.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, padding: "14px 16px", borderBottom: `1px solid ${C.grisMedio}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: C.azul, fontWeight: 700 }}>{r.id}</span>
                <Badge estado={r.estado} />
              </div>
              <div style={{ fontWeight: 700, color: C.texto, fontSize: 14, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                {r.titular}
                {Number(r.usuario_id_carga) !== Number(usuario.id) && ![1, 3, 5].includes(usuario.rol_id) && (
                  <span title="Cargado por otro usuario" style={{ display: "inline-flex", alignItems: "center", color: "#D97706" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
                    </svg>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.grisTexto, marginBottom: 8 }}>
                CIN°: {fmtNum(r.ci)}
                {!compact && ` · ${r.localidad_nombre || locNombre(r.localidad_id)}`}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <TipoBadge tipo={r.tipo} />
                {r.modalidad_cat && <CatBadge cat={r.modalidad_cat} />}
                <span style={{ fontSize: 11, color: C.grisTexto }}>{fmt(r.fecha_ejec)}</span>
                <EvidenciaIcons registro={r} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setDetalle(r)} style={{ flex: 1, padding: "8px 0", background: C.azul, color: C.blanco, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Ver detalle</button>
                {r.estado === "pendiente" && Number(r.usuario_id_carga) === Number(usuario.id) && onReabrir && (
                  <button onClick={() => onReabrir(r)} style={{ flex: 1, padding: "8px 0", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                )}
                {r.estado === "pendiente" && Number(r.usuario_id_carga) !== Number(usuario.id) && onReabrir && (
                  <div style={{ flex: 1, fontSize: 11, color: C.grisTexto, fontStyle: "italic", padding: "4px 0" }}>No fue cargado por usted</div>
                )}
                {r.estado === "rechazado" && onEditar && (
                  <button onClick={() => onEditar(r)} style={{ flex: 1, padding: "8px 0", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                )}
                {r.estado === "rechazado" && onReabrir && (Number(r.usuario_id_carga) === Number(usuario.id) || [1, 3, 5].includes(usuario.rol_id)) && (
                  <button onClick={() => onReabrir(r)} style={{ flex: 1, padding: "8px 0", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                )}
                {r.estado === "rechazado" && onReabrir && Number(r.usuario_id_carga) !== Number(usuario.id) && ![1, 3, 5].includes(usuario.rol_id) && (
                  <div style={{ flex: 1, fontSize: 11, color: C.grisTexto, fontStyle: "italic", padding: "4px 0" }}>No fue cargado por usted</div>
                )}
                {r.estado === "validado" && [1, 3, 5].includes(usuario.rol_id) && onReabrir && (
                  <button onClick={() => onReabrir(r)} style={{ flex: 1, padding: "8px 0", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {detalle && <ModalDetalleRegistro registro={detalle} onClose={() => setDetalle(null)} localidades={localidades} />}
      </>
    );
  }

  // ─── Desktop table layout ─────────────────────────────────────────────────
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: C.gris }}>
              {["#", "Titular", "Localidad", "Tipo", "Estrategia", "Fecha Ejec.", "Estado", "Evidencia", "Acciones"]
                .filter((_, i) => !compact || i !== 2)
                .map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}` }}>
                <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: C.azul, fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: "11px 14px", fontWeight: 600, color: C.texto }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {r.titular}
                    {Number(r.usuario_id_carga) !== Number(usuario.id) && ![1, 3, 5].includes(usuario.rol_id) && (
                      <span title="Cargado por otro usuario" style={{ display: "inline-flex", alignItems: "center", color: "#D97706", flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.grisTexto }}>CIN°: {fmtNum(r.ci)}</div>
                </td>
                {!compact && <td style={{ padding: "11px 14px", color: C.texto }}>{r.localidad_nombre || locNombre(r.localidad_id)}</td>}
                <td style={{ padding: "11px 14px" }}><TipoBadge tipo={r.tipo} /></td>
                <td style={{ padding: "11px 14px", maxWidth: 180 }}>
                  {r.modalidad_cat && <CatBadge cat={r.modalidad_cat} />}
                  <div style={{ fontSize: 11, color: C.grisTexto, marginTop: 3 }}>{r.modalidad_nombre || r.modalidad_id}</div>
                </td>
                <td style={{ padding: "11px 14px", color: C.grisTexto, whiteSpace: "nowrap" }}>{fmt(r.fecha_ejec)}</td>
                <td style={{ padding: "11px 14px" }}><Badge estado={r.estado} /></td>
                <td style={{ padding: "11px 14px" }}><EvidenciaIcons registro={r} /></td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => setDetalle(r)} style={{ padding: "5px 12px", background: C.azul, color: C.blanco, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Ver</button>
                    {r.estado === "pendiente" && Number(r.usuario_id_carga) === Number(usuario.id) && onReabrir && (
                      <button onClick={() => onReabrir(r)} style={{ padding: "5px 12px", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                    )}
                    {r.estado === "pendiente" && Number(r.usuario_id_carga) !== Number(usuario.id) && onReabrir && (
                      <span title="Este registro no fue cargado por usted" style={{ fontSize: 14, cursor: "help", color: C.grisTexto }}>ℹ️</span>
                    )}
                    {r.estado === "rechazado" && onEditar && (
                      <button onClick={() => onEditar(r)} style={{ padding: "5px 12px", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                    )}
                    {r.estado === "rechazado" && onReabrir && (Number(r.usuario_id_carga) === Number(usuario.id) || [1, 3, 5].includes(usuario.rol_id)) && (
                      <button onClick={() => onReabrir(r)} style={{ padding: "5px 12px", background: C.verde, color: C.blanco, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                    )}
                    {r.estado === "rechazado" && onReabrir && Number(r.usuario_id_carga) !== Number(usuario.id) && ![1, 3, 5].includes(usuario.rol_id) && (
                      <span title="Este registro no fue cargado por usted" style={{ fontSize: 14, cursor: "help", color: C.grisTexto }}>ℹ️</span>
                    )}
                    {r.estado === "validado" && [1, 3, 5].includes(usuario.rol_id) && onReabrir && (
                      <button onClick={() => onReabrir(r)} style={{ padding: "5px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Editar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detalle && <ModalDetalleRegistro registro={detalle} onClose={() => setDetalle(null)} localidades={localidades} />}
    </>
  );
}
