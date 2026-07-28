import fs from "node:fs";

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const payload = event.client_payload ?? {};
const rows = (value) => Array.isArray(value) ? value : Array.isArray(value?.value) ? value.value : [];
const number = (value) => { const parsed = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; };
const isoDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) {
    return new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000).toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
};

const base = rows(payload.base).filter((row) => row.ID_BT && row.Provision).map((row) => ({
  id: String(row.ID_BT),
  provision: String(row.Provision).trim(),
  annual: number(row.Cantidad_Anual_Zona_6),
  unit: String(row.Unidad_Base ?? "").trim(),
}));

const records = rows(payload.records)
  .filter((row) => row.ID_Registro && row.Provision && [2025, 2026].includes(number(row.Anio)))
  .map((row) => ({
    id: String(row.ID_Registro),
    contractYear: number(row.Anio),
    requestDate: isoDate(row.Fecha_Solicitud),
    dueDate: isoDate(row.Plazo_Entrega),
    provision: String(row.Provision).trim(),
    category: String(row.Categoria_BT || row.Provision).trim(),
    quantity: number(row.Cantidad_Solicitada),
    unit: String(row.Unidad ?? "").trim(),
    status: String(row.Estado || "Sin estado").trim(),
    observations: String(row.Observaciones ?? "").trim(),
  }));

if (!base.length) throw new Error("Power Automate no entregó filas de base técnica.");
fs.writeFileSync("docs/data/provisiones.json", JSON.stringify({ generatedAt: new Date().toISOString(), base, records }, null, 2) + "\n", "utf8");
console.log(`${base.length} provisiones base y ${records.length} movimientos procesados.`);
