import React, { useState } from "react";
import { C } from "../styles/colors";
import { Input, Select } from "../components/FormFields";
import TablaRegistros from "../components/TablaRegistros";

const locNombreById = (localidades, id) =>
  localidades.find((l) => Number(l.id) === Number(id))?.nombre || id;

function descargarCSV(regs, localidades) {
  const headers = ["ID", "Localidad", "Titular", "CI", "Celular", "Manzana", "Lote", "Tipo", "Estado", "Fecha Ejec."];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = regs.map((r) => [
    r.id,
    locNombreById(localidades, r.localidad_id),
    r.titular, r.ci, r.celular || "",
    r.manzana || "", r.lote || "",
    r.tipo, r.estado,
    r.fecha_ejec ? r.fecha_ejec.split("T")[0] : "",
  ].map(esc).join(","));
  const csv = "﻿" + [headers.map(esc).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registros_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VistaRegistros({ registros, usuario, onReabrir, localidades, modalidades }) {
  const rolId = usuario.rol_id;

  // Grupos de comportamiento:
  // [1, 3, 5] → Localidad select con TODAS las localidades
  // [2, 4, 7] → Localidad restringida a las asignadas (select si >1, readonly si =1)
  const localesRestringidas = [2, 4, 7].includes(rolId)
    ? localidades.filter((l) => (usuario.localidades || []).map(Number).includes(Number(l.id)))
    : [];

  const locInicialId = [2, 4, 7].includes(rolId) && localesRestringidas.length === 1
    ? String(localesRestringidas[0].id)
    : "";

  const [filtros, setFiltros] = useState({
    localidad: locInicialId,
    tipo: "", estado: "", busqueda: "", fecha_ejec: "",
  });
  const setF = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  const limpiarFiltros = () =>
    setFiltros({ localidad: locInicialId, tipo: "", estado: "", busqueda: "", fecha_ejec: "" });

  let regs = registros.filter((r) => {
    if (filtros.localidad && String(r.localidad_id) !== String(filtros.localidad)) return false;
    if (filtros.tipo && r.tipo !== filtros.tipo) return false;
    if (filtros.estado && r.estado !== filtros.estado) return false;
    if (filtros.fecha_ejec) {
      const fe = r.fecha_ejec ? r.fecha_ejec.split("T")[0] : "";
      if (fe !== filtros.fecha_ejec) return false;
    }
    if (filtros.busqueda) {
      const b = filtros.busqueda.toLowerCase();
      if (
        !String(r.titular ?? "").toLowerCase().includes(b) &&
        !String(r.ci ?? "").includes(b) &&
        !String(r.id ?? "").includes(b)
      ) return false;
    }
    return true;
  });

  const mostrarFiltroLocalidadTodas  = [1, 3, 5].includes(rolId);
  const mostrarFiltroLocalidadPropia = [2, 4, 7].includes(rolId);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.texto, margin: 0, letterSpacing: "-0.03em" }}>📋 Listado de Registros</h1>
        <p style={{ color: C.grisTexto, marginTop: 4, fontSize: 13 }}>
          {regs.length} registro{regs.length !== 1 ? "s" : ""} encontrado{regs.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.grisMedio}`, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>

        {/* Buscar — angosto para todos los roles */}
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Buscar</label>
          <Input placeholder="Nombre, CI o ID..." value={filtros.busqueda} onChange={(e) => setF("busqueda", e.target.value)} />
        </div>

        {/* Localidad — todas (roles 1, 3, 5) */}
        {mostrarFiltroLocalidadTodas && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Localidad</label>
            <Select value={filtros.localidad} onChange={(e) => setF("localidad", e.target.value)}>
              <option value="">Todas</option>
              {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
          </div>
        )}

        {/* Localidad — restringida (roles 2, 4, 7) */}
        {mostrarFiltroLocalidadPropia && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Localidad</label>
            {localesRestringidas.length === 1 ? (
              <Input value={localesRestringidas[0].nombre} readOnly style={{ background: C.gris, cursor: "default" }} />
            ) : (
              <Select value={filtros.localidad} onChange={(e) => setF("localidad", e.target.value)}>
                <option value="">Todas mis localidades</option>
                {localesRestringidas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Tipo</label>
          <Select value={filtros.tipo} onChange={(e) => setF("tipo", e.target.value)}>
            <option value=""></option>
            <option value="conectado">Conectado</option>
            <option value="adecuacion">Adecuación</option>
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Estado</label>
          <Select value={filtros.estado} onChange={(e) => setF("estado", e.target.value)}>
            <option value=""></option>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="validado">✅ Validado</option>
            <option value="rechazado">❌ Rechazado</option>
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grisTexto, display: "block", marginBottom: 5 }}>Fecha Ejec.</label>
          <Input type="date" value={filtros.fecha_ejec} onChange={(e) => setF("fecha_ejec", e.target.value)} />
        </div>

        <button onClick={limpiarFiltros} style={{ padding: "10px 18px", background: C.gris, border: `1px solid ${C.grisMedio}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.grisTexto, fontWeight: 600 }}>
          Limpiar
        </button>

        <button onClick={() => descargarCSV(regs, localidades)} style={{ padding: "10px 18px", background: "#DC2626", color: C.blanco, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          Descargar Listado
        </button>
      </div>

      <div style={{ background: C.blanco, borderRadius: 14, border: `1px solid ${C.grisMedio}`, overflow: "hidden" }}>
        <TablaRegistros registros={regs} usuario={usuario} onReabrir={onReabrir} localidades={localidades} />
      </div>
    </div>
  );
}
