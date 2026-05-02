import React, { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { fetchLocalidad } from "../services/api";
import { pct } from "../services/helpers";
import { StatCard, ProgressBar, Loading } from "../components/DataDisplay";
import TablaRegistros from "../components/TablaRegistros";

const fmt = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function VistaLocalidad({ localidadId, registros, usuario, setVista, localidades }) {
  const [locData, setLocData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLocalidad(localidadId).then((d) => { setLocData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [localidadId, registros]);

  if (loading) return <Loading text="Cargando localidad..." />;
  if (!locData) return <div style={{ padding: 40, textAlign: "center", color: C.grisTexto }}>Localidad no encontrada.</div>;

  const adeq = locData.adecuaciones_total || 0;
  const proyecciones = locData.proyecciones_icaro || [];
  const locRegs = registros.filter((r) => Number(r.localidad_id) === Number(localidadId));
  const conn      = locRegs.filter((r) => r.estado === "validado").length;
  const pendientes = locRegs.filter((r) => r.estado === "pendiente").length;
  const brecha    = Number(locData.previstas) - conn;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: C.texto, letterSpacing: "-0.03em" }}>📍 {locData.nombre}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.grisTexto }}>Junta de Saneamiento de {locData.nombre}</p>
          <button onClick={() => setVista("dashboard")} style={{ padding: "5px 16px", background: C.rojo, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.blanco, fontWeight: 600 }}>Volver</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="🎯" label="Meta" value={fmt(locData.previstas)} color={C.texto} />
        <StatCard icon="🔗" label="Conectados" value={fmt(conn)} sub="Solo validados" color={C.azul} />
        {/* <StatCard icon="🏠" label="Adecuaciones" value={fmt(adeq)} color="#B45309" /> */}
        {/* <StatCard icon="🏗️" label="CI Construidas" value={fmt(locData.ci)} color={C.grisTexto} /> */}
        <StatCard icon="⏳" label="Pendientes" value={pendientes} color={C.amarillo} />
        <StatCard icon="📉" label="Brecha" value={fmt(brecha)} color={C.rojo} />
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, padding: "20px 24px", border: `1px solid ${C.grisMedio}`, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Avance hacia la meta</h3>
        <ProgressBar value={conn} total={Number(locData.previstas)} color={pct(conn, locData.previstas) >= 50 ? C.verde : pct(conn, locData.previstas) >= 25 ? C.amarillo : C.rojo} />
      </div>

      {/* {proyecciones.length > 0 && (
        <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}`, background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#065F46" }}>🚀 Proyecciones Plan ICARO (18 meses)</h3>
          </div>
          <div style={{ padding: 20, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {proyecciones.map((p, i) => (
              <div key={i} className="fade-in" style={{ flex: 1, minWidth: 140, padding: "14px 16px", background: C.gris, borderRadius: 12, border: `1px solid ${C.grisMedio}`, animationDelay: `${i * 0.1}s` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.verde }}>{p.cantidad}</div>
                <div style={{ fontSize: 12, color: C.texto, fontWeight: 600, marginTop: 2 }}>{p.modalidad}</div>
              </div>
            ))}
            <div style={{ flex: 1, minWidth: 140, padding: "14px 16px", background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", borderRadius: 12, border: "1px solid #6EE7B7" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.verde }}>{proyecciones.reduce((a, p) => a + p.cantidad, 0)}</div>
              <div style={{ fontSize: 12, color: "#065F46", fontWeight: 700, marginTop: 2 }}>TOTAL PROYECTADO</div>
            </div>
          </div>
        </div>
      )} */}

      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.grisMedio}` }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Registros de {locData.nombre}</h3>
        </div>
        <TablaRegistros registros={locRegs} usuario={usuario} compact localidades={localidades} />
      </div>
    </div>
  );
}
