export const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

export const fmtDT = (d) =>
  d ? new Date(d).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export const pct = (v, t) => (t ? Math.min(100, Math.round((v / t) * 100)) : 0);
