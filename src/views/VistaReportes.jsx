import React from "react";
import { C } from "../styles/colors";
import { CatBadge } from "../components/Badges";
import { useMobile } from "../hooks/useMobile";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PIE_COLORS = [
  C.azul, C.verde, C.amarillo, C.rojo,
  "#7C3AED", "#0891B2", "#DB2777", "#65A30D",
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, payload: d } = payload[0];
    const color = d.pct >= 50 ? C.verde : d.pct >= 25 ? C.amarillo : C.rojo;
    return (
      <div style={{ background: C.blanco, border: `1px solid ${C.grisMedio}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, boxShadow: "0 2px 8px rgba(18,85,161,0.10)", minWidth: 180 }}>
        <div style={{ fontWeight: 700, color: C.texto, marginBottom: 6 }}>{name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ color: C.grisTexto }}>Previstas</span>
          <span style={{ fontWeight: 700, color: C.texto }}>{d.previstas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ color: C.grisTexto }}>Conectados</span>
          <span style={{ fontWeight: 700, color: C.azul }}>{value}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: C.grisTexto }}>Avance</span>
          <span style={{ fontWeight: 800, color }}>{d.pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function VistaReportes({ registros, localidades, modalidades }) {
  const isMobile = useMobile();
  const validados = registros.filter((r) => r.estado === "validado");

  // Datos de torta: misma lógica que "Estado por Localidad" del Dashboard
  const pieData = localidades
    .map((loc) => {
      const conn = registros.filter((r) => Number(r.localidad_id) === Number(loc.id) && r.estado === "validado").length;
      const previstas = Number(loc.previstas) || 0;
      const pct = previstas ? parseFloat(((conn / previstas) * 100).toFixed(2)) : 0;
      return { name: loc.nombre, value: conn, previstas, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  const porMod = modalidades.map((m) => {
    const n = validados.filter((r) => Number(r.modalidad_id) === Number(m.id)).length;
    return { ...m, n };
  }).filter((m) => m.n > 0).sort((a, b) => b.n - a.n);

  const pad = isMobile ? "12px 14px" : "16px 20px";
  const padBody = isMobile ? 14 : 20;

  return (
    <div>
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>📈 Reportes y Estadísticas</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>Basados en registros validados</p>        
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 14 : 20, marginBottom: 24 }}>

        {/* Registros por estrategia */}
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
          <div style={{ padding: pad, borderBottom: `1px solid ${C.grisMedio}`, background: `linear-gradient(135deg,${C.azulSuave},${C.blanco})` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Registros por estrategias (validados)</h3>
          </div>
          <div style={{ padding: padBody }}>
            {porMod.length === 0 && <div style={{ textAlign: "center", color: C.grisTexto, padding: 20 }}>Sin datos aún.</div>}
            {porMod.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <CatBadge cat={m.cat} />
                <span style={{ flex: 1, fontSize: isMobile ? 11 : 12 }}>{m.nombre}</span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: C.azul, whiteSpace: "nowrap" }}>{m.n}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Gráfico de torta: conectados validados por localidad */}
      {pieData.length > 0 && (
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: pad, borderBottom: `1px solid ${C.grisMedio}`, background: `linear-gradient(135deg,${C.azulSuave},${C.blanco})` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Distribución de conectados por localidad</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.grisTexto }}>Sólo se contabilizan registros <strong>validados</strong></p>
          </div>
          <div style={{ padding: padBody }}>
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 55 : 75}
                  outerRadius={isMobile ? 95 : 130}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ index, percent }) =>
                    percent > 0.03 ? `${pieData[index].pct}%` : ""
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ fontSize: isMobile ? 11 : 12, color: C.texto, fontWeight: 600 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
