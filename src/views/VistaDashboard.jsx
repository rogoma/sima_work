import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchDashboard } from "../services/api";
import { pct } from "../services/helpers";
import { StatCard, ProgressBar } from "../components/DataDisplay";

export default function VistaDashboard({ usuario, localidades, registros, setVista, setLocalidadSeleccionada }) {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetchDashboard().then(setDashboard).catch(() => {});
  }, [registros]);

  const d = dashboard || { conectados_total: 0, adecuaciones_total: 0, previstas_total: 0, pendientes: 0, avance_pct: 0, brecha: 0 };
  const fmt = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>📊 Dashboard General</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>Resumen del programa · Línea base: agosto 2025 · Datos en tiempo real</p>
      </div>

      {d.pendientes > 0 && (
        <div className="fade-in" style={{ background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "1px solid #FCD34D", borderRadius: 14, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>{d.pendientes} registro{d.pendientes > 1 ? "s" : ""} pendiente{d.pendientes > 1 ? "s" : ""} de validación</div>
            <div style={{ fontSize: 12, color: "#B45309" }}>Requiere revisión del Coordinador de Validación.</div>
          </div>
          {usuario.rol === "coordinador" && (
            <button onClick={() => setVista("validacion")} style={{ padding: "8px 18px", background: "#D97706", color: C.blanco, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "transform 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
              Ir a Validación →
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="🔗" label="Conectados a la Red" value={fmt(d.conectados_total)} sub={`Meta: ${fmt(d.previstas_total)}`} color={C.azul} />
        {/* <StatCard icon="🏠" label="Adecuaciones Intraprediales" value={fmt(d.adecuaciones_total)} color={C.azulMedio} /> */}
        <StatCard icon="⏳" label="Pendientes Validación" value={fmt(d.pendientes)} color={C.amarillo} />
        <StatCard icon="📈" label="Avance del Programa" value={`${d.avance_pct}%`} sub={`${fmt(d.brecha)} en brecha`} color={C.verde} />
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, padding: "20px 24px", border: `1px solid ${C.grisMedio}`, marginBottom: 24, boxShadow: "0 1px 6px rgba(18,85,161,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.texto }}>Avance Global del Programa</h3>
          <span style={{ fontSize: 12, color: C.grisTexto }}>7 localidades · Plan ICARO 18 meses</span>
        </div>
        <ProgressBar value={d.conectados_total} total={d.previstas_total} color={C.azul} />
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden", boxShadow: "0 1px 6px rgba(18,85,161,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.texto }}>Estado por Localidad</h3>
          <span style={{ fontSize: 12, color: C.grisTexto }}>Sólo se contabilizan registros <strong>validados</strong></span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: C.gris }}>
                {["Localidad", "Previstas", "Conectados", "CI Construidas", "Avance", "Brecha", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
                {/* {["Localidad", "Previstas", "Conectados", "Adecuaciones", "CI Construidas", "Avance", "Brecha", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.grisTexto, fontSize: 12, borderBottom: `1px solid ${C.grisMedio}`, whiteSpace: "nowrap" }}>{h}</th>
                ))} */}
              </tr>
            </thead>
            <tbody>
              {localidades.map((loc, i) => {
                const p = loc.avance_pct || 0;
                const conn = loc.conectados_total || 0;
                const adeq = loc.adecuaciones_total || 0;
                return (
                  <tr key={loc.id} style={{ backgroundColor: i % 2 === 0 ? C.blanco : C.gris, borderBottom: `1px solid ${C.grisMedio}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.azulSuave)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? C.blanco : C.gris)}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: C.texto }}>{loc.nombre}</td>
                    <td style={{ padding: "12px 14px", color: C.grisTexto, fontWeight: 600 }}>{fmt(loc.previstas)}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: C.azul }}>{fmt(conn)}</td>
                    {/* <td style={{ padding: "12px 14px", color: "#B45309", fontWeight: 600 }}>{fmt(adeq)}</td> */}
                    <td style={{ padding: "12px 14px", color: C.grisTexto }}>{fmt(loc.ci)}</td>
                    <td style={{ padding: "12px 14px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: C.grisMedio, borderRadius: 3, overflow: "hidden" }}>
                          <div className="bar-anim" style={{ height: "100%", width: `${p}%`, backgroundColor: p >= 50 ? C.verde : p >= 25 ? C.amarillo : C.rojo, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: p >= 50 ? C.verde : p >= 25 ? C.amarillo : C.rojo, minWidth: 32 }}>{p}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: C.rojo, fontWeight: 600 }}>{fmt(loc.brecha || 0)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => { setLocalidadSeleccionada(loc.id); setVista("localidad"); }}
                        style={{ padding: "6px 14px", background: C.azul, color: C.blanco, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
