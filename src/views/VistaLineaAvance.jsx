import React, { useState, useMemo } from "react";
import { C } from "../styles/colors";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const selStyle = {
  padding: "7px 10px",
  border: `1px solid ${C.grisMedio}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.texto,
  background: C.blanco,
  cursor: "pointer",
  outline: "none",
};

function Card({ icon, label, value, sub, color = C.azul }) {
  return (
    <div style={{
      background: C.blanco, borderRadius: 12, padding: "16px 18px",
      flex: 1, minWidth: 130,
      border: `1px solid ${C.grisMedio}`,
      boxShadow: "0 1px 4px rgba(18,85,161,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>{icon}</span>
        <span style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, lineHeight: 1.25 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.grisTexto, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function VistaLineaAvance({ registros, localidades }) {
  const hoy = new Date();

  // Solo conexiones validadas (estado_id = 4)
  const conexiones = useMemo(
    () => registros.filter((r) => Number(r.estado_id) === 4 && r.fecha_ejec),
    [registros]
  );

  // Años únicos de fecha_ejec
  const años = useMemo(() => {
    const s = new Set(conexiones.map((r) => new Date(r.fecha_ejec).getFullYear()));
    return [...s].sort((a, b) => b - a);
  }, [conexiones]);

  const [año, setAño] = useState(() => {
    const cur = hoy.getFullYear();
    return años.includes(cur) ? cur : (años[0] ?? cur);
  });
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [localidad, setLocalidad] = useState("todas");
  const [nivel, setNivel] = useState("diario");
  const [modo, setModo] = useState("acumulado");
  const [puntoSel, setPuntoSel] = useState(null);

  // Meses únicos del año seleccionado (sin filtro de localidad)
  const mesesDisp = useMemo(() => {
    const s = new Set(
      conexiones
        .filter((r) => new Date(r.fecha_ejec).getFullYear() === Number(año))
        .map((r) => new Date(r.fecha_ejec).getMonth() + 1)
    );
    return [...s].sort((a, b) => a - b);
  }, [conexiones, año]);

  // Localidades únicas en las conexiones
  const locsDisp = useMemo(() => {
    const map = new Map();
    conexiones.forEach((r) => {
      if (!map.has(r.localidad_id)) {
        const loc = localidades.find((l) => Number(l.id) === Number(r.localidad_id));
        map.set(r.localidad_id, loc?.nombre || r.localidad_nombre || String(r.localidad_id));
      }
    });
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [conexiones, localidades]);

  // Filtradas por localidad
  const filtradas = useMemo(
    () => localidad === "todas"
      ? conexiones
      : conexiones.filter((r) => String(r.localidad_id) === String(localidad)),
    [conexiones, localidad]
  );

  const totalConexiones = filtradas.length;

  const conexionesMes = useMemo(
    () => filtradas.filter((r) => {
      const d = new Date(r.fecha_ejec);
      return d.getFullYear() === Number(año) && d.getMonth() + 1 === Number(mes);
    }).length,
    [filtradas, año, mes]
  );

  // Datos del gráfico
  const chartData = useMemo(() => {
    let raw = [];

    if (nivel === "diario") {
      const daysInMonth = new Date(Number(año), Number(mes), 0).getDate();
      const counts = {};
      for (let d = 1; d <= daysInMonth; d++) counts[d] = 0;
      filtradas
        .filter((r) => {
          const d = new Date(r.fecha_ejec);
          return d.getFullYear() === Number(año) && d.getMonth() + 1 === Number(mes);
        })
        .forEach((r) => {
          const d = new Date(r.fecha_ejec).getDate();
          counts[d] = (counts[d] || 0) + 1;
        });
      raw = Object.entries(counts)
        .sort((a, b) => +a[0] - +b[0])
        .map(([d, v]) => ({ name: d, conexiones: v }));

    } else if (nivel === "mensual") {
      const counts = {};
      for (let m = 1; m <= 12; m++) counts[m] = 0;
      filtradas
        .filter((r) => new Date(r.fecha_ejec).getFullYear() === Number(año))
        .forEach((r) => {
          const m = new Date(r.fecha_ejec).getMonth() + 1;
          counts[m] = (counts[m] || 0) + 1;
        });
      raw = Object.entries(counts)
        .sort((a, b) => +a[0] - +b[0])
        .map(([m, v]) => ({ name: MESES[+m - 1].slice(0, 3), _m: +m, conexiones: v }));

    } else {
      // anual
      const counts = {};
      filtradas.forEach((r) => {
        const y = new Date(r.fecha_ejec).getFullYear();
        counts[y] = (counts[y] || 0) + 1;
      });
      raw = Object.entries(counts)
        .sort((a, b) => +a[0] - +b[0])
        .map(([y, v]) => ({ name: y, conexiones: v }));
    }

    if (modo === "acumulado") {
      let acc = 0;
      return raw.map((item) => { acc += item.conexiones; return { ...item, conexiones: acc }; });
    }
    return raw;
  }, [filtradas, año, mes, nivel, modo]);

  // Tooltip personalizado (closure sobre nivel/mes/año)
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const valor = payload[0].value;
    let label;
    if (nivel === "diario")       label = `${item.name} de ${MESES[mes - 1]} ${año}`;
    else if (nivel === "mensual") label = `${MESES[(item._m || 1) - 1]} ${año}`;
    else                          label = String(item.name);
    return (
      <div style={{ background: C.blanco, border: `1px solid ${C.grisMedio}`, borderRadius: 10, padding: "10px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize: 12, color: C.grisTexto, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.azul, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.azul, display: "inline-block" }} />
          Conexiones: {valor}
        </div>
      </div>
    );
  };

  const handleChartClick = (data) => {
    if (data?.activePayload?.length) setPuntoSel(data.activePayload[0].payload);
  };

  const puntoValor = puntoSel != null ? puntoSel.conexiones : "-";
  const puntoLabel = puntoSel
    ? nivel === "diario"
      ? `${puntoSel.name} de ${MESES[mes - 1]} ${año}`
      : nivel === "mensual"
      ? `${MESES[(puntoSel._m || 1) - 1]} ${año}`
      : String(puntoSel.name)
    : "Haga clic en el gráfico";

  const xLabel = nivel === "diario" ? "Días" : nivel === "mensual" ? "Meses" : "Años";
  const card4Label = nivel === "anual" ? "Conexiones en el Año" : "Conexiones en el Mes";
  const card5Label = nivel === "diario" ? "Conexiones en el Día" : nivel === "mensual" ? "Conexiones en el Mes (sel.)" : "Conexiones en el Año (sel.)";

  const cambiarNivel = (v) => { setNivel(v); setPuntoSel(null); };
  const cambiarAño   = (v) => { setAño(v);   setPuntoSel(null); };
  const cambiarMes   = (v) => { setMes(v);   setPuntoSel(null); };
  const cambiarLoc   = (v) => { setLocalidad(v); setPuntoSel(null); };
  const cambiarModo  = (v) => { setModo(v);  setPuntoSel(null); };

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: C.texto, margin: 0, letterSpacing: "-0.02em" }}>
          LÍNEA DE AVANCE
        </h2>
        <p style={{ fontSize: 13, color: C.grisTexto, margin: "6px 0 0" }}>
          Visualice el avance histórico de conexiones al sistema de alcantarillado sanitario.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <Card icon="👥" label="Conexiones Totales"   value={totalConexiones.toLocaleString()}  sub="Conexiones validadas"        color={C.azul}      />
        <Card icon="📅" label="Año Seleccionado"     value={String(año)}                       sub="Acumulado a la fecha"        color={C.azulMedio} />
        <Card icon="🗓️" label="Mes Seleccionado"     value={MESES[mes - 1]}                    sub="Acumulado al mes"            color="#7B2FBE"     />
        <Card icon="📈" label={card4Label}            value={conexionesMes.toLocaleString()}    sub={`${MESES[mes - 1]} ${año}`}  color={C.amarillo}  />
        <Card icon="📆" label={card5Label}            value={String(puntoValor)}                sub={puntoLabel}                  color={C.verde}     />
      </div>

      {/* Filtros y controles */}
      <div style={{ background: C.blanco, borderRadius: 12, padding: "16px 20px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 4px rgba(18,85,161,0.06)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>

          {/* Modo de visualización */}
          <div>
            <div style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, marginBottom: 6 }}>Modo de Visualización</div>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.grisMedio}` }}>
              {[["acumulado","Acumulado"],["periodo","Por período"]].map(([v, l]) => (
                <button key={v} onClick={() => cambiarModo(v)} style={{
                  padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: modo === v ? C.azul : C.blanco,
                  color:      modo === v ? C.blanco : C.grisTexto,
                  transition: "all 0.15s",
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Año */}
          <div>
            <div style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, marginBottom: 6 }}>Año</div>
            <select value={año} onChange={(e) => cambiarAño(+e.target.value)} style={selStyle}>
              {(años.length ? años : [hoy.getFullYear()]).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div>
            <div style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, marginBottom: 6 }}>Mes</div>
            <select value={mes} onChange={(e) => cambiarMes(+e.target.value)} style={selStyle}>
              {(mesesDisp.length ? mesesDisp : Array.from({ length: 12 }, (_, i) => i + 1)).map((m) => (
                <option key={m} value={m}>{MESES[m - 1]}</option>
              ))}
            </select>
          </div>

          {/* Localidad */}
          <div>
            <div style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, marginBottom: 6 }}>Localidad</div>
            <select value={localidad} onChange={(e) => cambiarLoc(e.target.value)} style={{ ...selStyle, minWidth: 160 }}>
              <option value="todas">Todas</option>
              {locsDisp.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {/* Nivel de Vista */}
          <div style={{ marginLeft: "auto" }}>
            <div style={{ fontSize: 11, color: C.grisTexto, fontWeight: 600, marginBottom: 6 }}>Nivel de Vista</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["anual","Anual"],["mensual","Mensual"],["diario","Diario"]].map(([v, l]) => (
                <button key={v} onClick={() => cambiarNivel(v)} style={{
                  padding: "7px 14px", border: "none", borderRadius: 8,
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: nivel === v ? C.azul : C.gris,
                  color:      nivel === v ? C.blanco : C.grisTexto,
                  transition: "all 0.15s",
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ background: C.blanco, borderRadius: 12, padding: "20px 20px 16px", border: `1px solid ${C.grisMedio}`, boxShadow: "0 1px 4px rgba(18,85,161,0.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.texto, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          Avance de Conexiones
          <span style={{ fontSize: 13, color: C.grisTexto, fontWeight: 400, cursor: "help" }} title="Haga clic en un punto del gráfico para ver el detalle">ⓘ</span>
        </div>

        {chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.grisTexto, fontSize: 14 }}>
            Sin datos para el período seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              onClick={handleChartClick}
              margin={{ top: 10, right: 30, left: 0, bottom: 24 }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.grisMedio} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: C.grisTexto }}
                label={{ value: xLabel, position: "insideBottom", offset: -12, fontSize: 11, fill: C.grisTexto }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.grisTexto }}
                allowDecimals={false}
                label={{ value: "Conexiones", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: C.grisTexto }}
              />
              <Tooltip content={renderTooltip} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: C.grisTexto, paddingTop: 8 }}
                formatter={() => "Conexiones"}
              />
              <Line
                type="monotone"
                dataKey="conexiones"
                stroke={C.azul}
                strokeWidth={2}
                dot={{ r: 4, fill: C.azul, stroke: C.blanco, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: C.azulOscuro, stroke: C.blanco, strokeWidth: 2, cursor: "pointer" }}
                name="Conexiones"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.grisMedio}` }}>
          <div style={{ fontSize: 11, color: C.azul }}>
            ⓘ Los datos se actualizan automáticamente con las conexiones validadas.
          </div>
          <div style={{ fontSize: 11, color: C.grisTexto }}>
            Última actualización: {hoy.toLocaleDateString("es-PY")} {hoy.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}
