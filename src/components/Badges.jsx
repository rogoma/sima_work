import React from "react";
import { C } from "../styles/colors";

export function Badge({ estado }) {
  const cfg = {
    pendiente: { bg: "#FFFBEB", c: "#B45309", t: "⏳ Pendiente" },
    validado: { bg: "#ECFDF5", c: "#065F46", t: "✅ Validado" },
    rechazado: { bg: "#FEF2F2", c: "#991B1B", t: "❌ Rechazado" },
  }[estado] || { bg: "#F1F5F9", c: "#475569", t: estado };

  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: cfg.bg, color: cfg.c, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
      {cfg.t}
    </span>
  );
}

export function TipoBadge({ tipo }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: tipo === "conectado" ? "#EFF6FF" : "#FEF9C3", color: tipo === "conectado" ? "#1D4ED8" : "#B45309", letterSpacing: "-0.01em" }}>
      {tipo === "conectado" ? "🔗 Conectado a la Red" : "🏠 Adecuación Intrapredial"}
    </span>
  );
}

export function CatBadge({ cat }) {
  const cfg = {
    JUNTA: { bg: "#DBEAFE", c: "#1D4ED8" },
    CONTRATISTA: { bg: "#EDE9FE", c: "#6D28D9" },
    ICARO: { bg: "#DCFCE7", c: "#065F46" },
  }[cat] || { bg: "#F1F5F9", c: "#475569" };

  return (
    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 800, backgroundColor: cfg.bg, color: cfg.c, letterSpacing: "0.03em" }}>
      {cat}
    </span>
  );
}

export function RolBadge({ rol }) {
  const cfg = {
    coordinador: { bg: "#FEF2F2", c: "#991B1B", t: "Coordinador de Validación" },
    junta: { bg: "#EFF6FF", c: "#1D4ED8", t: "Junta de Saneamiento" },
    contratista: { bg: "#F5F3FF", c: "#6D28D9", t: "Empresa Contratista" },
    equipo: { bg: "#ECFDF5", c: "#065F46", t: "Equipo Social DASOC" },
  }[rol] || { bg: "#F1F5F9", c: "#475569", t: rol };

  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: cfg.bg, color: cfg.c }}>
      {cfg.t}
    </span>
  );
}
