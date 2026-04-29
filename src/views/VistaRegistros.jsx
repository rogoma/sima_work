import React, { useState } from "react";
import { C } from "../styles/colors";
import { Input, Select } from "../components/FormFields";
import TablaRegistros from "../components/TablaRegistros";

export default function VistaRegistros({ registros, usuario, onReabrir, localidades, modalidades }) {
  const [filtros, setFiltros] = useState({ localidad: "", tipo: "", estado: "", busqueda: "" });
  const setF = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  let regs = registros.filter((r) => {
    if (filtros.localidad && String(r.localidad_id) !== String(filtros.localidad)) return false;
    if (filtros.tipo && r.tipo !== filtros.tipo) return false;
    if (filtros.estado && r.estado !== filtros.estado) return false;
    if (filtros.busqueda) {
      const b = filtros.busqueda.toLowerCase();
      const titular = String(r.titular ?? "").toLowerCase();
      const ci      = String(r.ci ?? "");
      const id      = String(r.id ?? "").toLowerCase();
      if (!titular.includes(b) && !ci.includes(b) && !id.includes(b)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>📋 Listado de Registros</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>{regs.length} registro{regs.length !== 1 ? "s" : ""} encontrado{regs.length !== 1 ? "s" : ""}</p>
      </div>
      <div style={{ background: C.blanco, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.grisMedio}`, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Buscar</label>
          <Input placeholder="Nombre, CI o ID..." value={filtros.busqueda} onChange={(e) => setF("busqueda", e.target.value)} />
        </div>
        {(usuario.rol === "coordinador" || usuario.rol === "equipo") && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Localidad</label>
            <Select value={filtros.localidad} onChange={(e) => setF("localidad", e.target.value)}>
              <option value="">Todas</option>
              {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Tipo</label>
          <Select value={filtros.tipo} onChange={(e) => setF("tipo", e.target.value)}>
            <option value="">Todos</option><option value="conectado">Conectado</option><option value="adecuacion">Adecuación</option>
          </Select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Estado</label>
          <Select value={filtros.estado} onChange={(e) => setF("estado", e.target.value)}>
            <option value="">Todos</option><option value="pendiente">⏳ Pendiente</option><option value="validado">✅ Validado</option><option value="rechazado">❌ Rechazado</option>
          </Select>
        </div>
        <button onClick={() => setFiltros({ localidad: "", tipo: "", estado: "", busqueda: "" })} style={{ padding: "10px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.grisTexto, fontWeight: 600 }}>Limpiar</button>
      </div>
      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
        <TablaRegistros registros={regs} usuario={usuario} onReabrir={onReabrir} localidades={localidades} />
      </div>
    </div>
  );
}
