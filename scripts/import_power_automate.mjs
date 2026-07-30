import fs from "node:fs";

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const payload = event.client_payload ?? {};
const rows = (value) => Array.isArray(value) ? value : Array.isArray(value?.value) ? value.value : [];
const baseRow = (row) => Array.isArray(row) ? {
  ID_BT: row[0],
  Provision: row[1],
  Cantidad_Anual_Zona_6: row[2],
  Unidad_Base: row[3],
} : row;
const recordRow = (row) => Array.isArray(row) ? {
  ID_Registro: row[0],
  Anio: row[1],
  Fecha_Solicitud: row[2],
  Plazo_Entrega: row[3],
  Provision: row[4],
  Categoria_BT: row[5],
  Cantidad_Solicitada: row[6],
  Unidad: row[7],
  Estado: row[8],
  Observaciones: row[9],
} : row;
const previousPath = "docs/data/provisiones.json";
const previousRecords = fs.existsSync(previousPath)
  ? JSON.parse(fs.readFileSync(previousPath, "utf8")).records ?? []
  : [];
const previousById = new Map(previousRecords.map((record) => [String(record.id), record]));
const number = (value) => { const parsed = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; };
const isoDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) {
    return new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000).toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
};

const base = rows(payload.base).map(baseRow).filter((row) => row.ID_BT && row.Provision).map((row) => ({
  id: String(row.ID_BT),
  provision: String(row.Provision).trim(),
  annual: number(row.Cantidad_Anual_Zona_6),
  unit: String(row.Unidad_Base ?? "").trim(),
}));

const records = rows(payload.records)
  .map(recordRow)
  .filter((row) => row.ID_Registro && row.Provision && [2025, 2026].includes(number(row.Anio)))
  .map((row) => {
    const previous = previousById.get(String(row.ID_Registro)) ?? {};
    return {
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
      manifoldMonth: String(row.Mes_LS ?? previous.manifoldMonth ?? "").trim(),
      bookSheet: String(row.Foja ?? previous.bookSheet ?? "").trim(),
      serviceOrder: String(row.Orden_Servicio ?? previous.serviceOrder ?? "").trim(),
    };
  });

if (!base.length) throw new Error("Power Automate no entregó filas de base técnica.");
const output = JSON.stringify({ generatedAt: new Date().toISOString(), base, records }, null, 2) + "\n";
fs.writeFileSync("docs/data/provisiones.json", output, "utf8");
fs.writeFileSync("public/data/provisiones.json", output, "utf8");
console.log(`${base.length} provisiones base y ${records.length} movimientos procesados.`);