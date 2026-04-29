import React from "react";
import { C } from "../styles/colors";
import { pct } from "../services/helpers";
import { CatBadge } from "../components/Badges";
import { ProgressBar } from "../components/DataDisplay";

export default function VistaReportes({ registros, localidades, modalidades }) {
  const validados = registros.filter((r) => r.estado === "validado");

  const porLoc = localidades.map((l) => {
    const conn = l.conectados_total || Number(l.conectados_base || 0);
    const p = pct(conn, l.previstas);
    return { ...l, conn, pct: p };
  }).sort((a, b) => b.pct - a.pct);

  const porMod = modalidades.map((m) => {
    const n = validados.filter((r) => Number(r.modalidad_id) === Number(m.id)).length;
    return { ...m, n };
  }).filter((m) => m.n > 0).sort((a, b) => b.n - a.n);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>📈 Reportes y Estadísticas</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>Basados en registros validados</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}`, background: `linear-gradient(135deg,${C.azulSuave},${C.blanco})` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Avance por localidad</h3>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {porLoc.map((l) => (
              <div key={l.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l.nombre}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: l.pct >= 50 ? C.verde : l.pct >= 25 ? C.amarillo : C.rojo }}>{l.pct}%</span>
                </div>
                <ProgressBar value={l.conn} total={Number(l.previstas)} color={l.pct >= 50 ? C.verde : l.pct >= 25 ? C.amarillo : C.rojo} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}`, background: `linear-gradient(135deg,${C.azulSuave},${C.blanco})` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Registros por estrategias (validados)</h3>
          </div>
          <div style={{ padding: 20 }}>
            {porMod.length === 0 && <div style={{ textAlign: "center", color: C.grisTexto, padding: 20 }}>Sin datos aún.</div>}
            {porMod.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <CatBadge cat={m.cat} />
                <span style={{ flex: 1, fontSize: 12 }}>{m.nombre}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.azul }}>{m.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
