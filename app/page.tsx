"use client";

import {useEffect, useMemo, useState} from "react";

type BaseProvision = {id: string; provision: string; annual: number; unit: string};
type RecordItem = {
  id: string;
  contractYear: number;
  requestDate: string | null;
  dueDate: string | null;
  provision: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  observations: string;
};
type DashboardData = {generatedAt: string; base: BaseProvision[]; records: RecordItem[]};

const formatNumber = new Intl.NumberFormat("es-CL", {maximumFractionDigits: 1});
const isReceived = (status: string) => /ok|recepcionado/i.test(status);
const daysUntil = (dueDate: string | null) => {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((Date.UTC(year, month - 1, day) - todayUtc) / 86400000);
};
const urgency = (days: number | null) => {
  if (days === null) return {className: "noDate", label: "Sin fecha informada"};
  if (days < 0) return {className: "late", label: `${Math.abs(days)} ${Math.abs(days) === 1 ? "día de atraso" : "días de atraso"}`};
  if (days === 0) return {className: "late", label: "Vence hoy"};
  if (days <= 7) return {className: "soon", label: `${days} ${days === 1 ? "día restante" : "días restantes"}`};
  return {className: "onTime", label: `${days} días restantes`};
};
const displayText = (value: string) => value
  .replaceAll("Cesped", "Césped")
  .replaceAll("Arboles", "Árboles")
  .replaceAll("Tuberia", "Tubería")
  .replaceAll("Valvula", "Válvula")
  .replaceAll("hormigon", "hormigón");

const technicalDocs = [
  {title: "Césped", section: "3.7.3.9", printed: "21–22", pdf: 22, image: "cesped.webp"},
  {title: "Árboles y arbustos", section: "3.7.4.5", printed: "24–28", pdf: 25, image: "arboles-arbustos.webp"},
  {title: "Florales y semillas", section: "3.7.7.1.5–1.6", printed: "31–34", pdf: 32, image: "florales-semillas.webp"},
  {title: "Fertilización", section: "3.7.8.1", printed: "35", pdf: 36, image: "fertilizacion.webp"},
  {title: "Riego y PVC", section: "3.8.4.2–4.4", printed: "40–43", pdf: 41, image: "riego-pvc.webp"},
  {title: "Áridos", section: "3.9.2", printed: "45–46", pdf: 46, image: "aridos.webp"},
];

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

function StatusRing({value}: {value: number}) {
  return <div className="statusRing" style={{"--progress": `${value * 3.6}deg`} as React.CSSProperties}>
    <div><strong>{value.toFixed(0)}%</strong><span>cumplido</span></div>
  </div>;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"control" | "bases">("control");
  const [year, setYear] = useState("2026");
  const [status, setStatus] = useState("Todos");
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const liveData = `https://raw.githubusercontent.com/nburgosfigueroa-bit/PROVISIONES-MAIPU-ZONA-6/main/docs/data/provisiones.json?t=${Date.now()}`;
    fetch(liveData, {cache: "no-store"})
      .then(response => {
        if (!response.ok) throw new Error("No fue posible obtener la actualización");
        return response.json();
      })
      .catch(() => fetch("/data/provisiones.json").then(response => response.json()))
      .then(setData);
  }, []);

  const numericYear = Number(year);
  const categories = useMemo(
    () => data ? [...new Set(data.base.map(item => item.provision))] : [],
    [data],
  );
  const movements = useMemo(
    () => data?.records.filter(item =>
      String(item.contractYear) === year &&
      (status === "Todos" || (status === "Recepcionado" ? isReceived(item.status) : !isReceived(item.status))) &&
      (category === "Todas" || item.category === category) &&
      `${item.provision} ${item.observations}`.toLowerCase().includes(query.toLowerCase()),
    ) || [],
    [data, year, status, category, query],
  );
  const progress = useMemo(
    () => data?.base.filter(item => item.annual > 0).map(item => {
      const delivered = data.records
        .filter(record =>
          record.contractYear === numericYear &&
          isReceived(record.status) &&
          record.category === item.provision &&
          record.unit.toLowerCase() === item.unit.toLowerCase(),
        )
        .reduce((total, record) => total + record.quantity, 0);
      return {...item, delivered, pct: Math.min(delivered / item.annual * 100, 100)};
    }).sort((a, b) => b.pct - a.pct) || [],
    [data, numericYear],
  );

  const inCourse = (data?.records.filter(item => item.contractYear === numericYear && !isReceived(item.status)) || [])
    .map(item => ({...item, days: daysUntil(item.dueDate)}))
    .sort((a, b) => (a.days ?? Number.POSITIVE_INFINITY) - (b.days ?? Number.POSITIVE_INFINITY));
  const completed = progress.filter(item => item.pct >= 100).length;
  const general = progress.length ? completed / progress.length * 100 : 0;
  const topProgress = progress.filter(item => item.pct > 0).slice(0, 6);

  if (!data) return <main className="loading">Preparando provisiones…</main>;

  return <main>
    <section className="hero">
      <img src="/contrato/vista-general.jpeg" alt="Vista aérea de áreas verdes de Maipú Zona 6"/>
      <div className="heroShade"/>
      <div className="heroTop">
        <div className="brandMark"><span>M6</span><div><strong>Maipú</strong><small>Zona 6 · Áreas verdes</small></div></div>
        <div className="freshness"><span className="liveDot"/>Datos actualizados · {new Date(data.generatedAt).toLocaleDateString("es-CL")}</div>
      </div>
      <div className="heroContent">
        <p className="eyebrow light">GESTIÓN CONTRACTUAL · 2024–2026</p>
        <h1>Control de<br/><em>provisiones</em></h1>
        <p>Seguimiento ejecutivo de solicitudes, entregas y cumplimiento contractual para la mantención de áreas verdes.</p>
      </div>
      <a className="heroPdf" href="/base-tecnica/bases-tecnicas-zona-6.pdf" target="_blank" rel="noreferrer">
        <span>Consultar respaldo</span>
        <strong>Ver base técnica</strong>
        <ArrowIcon/>
      </a>
    </section>

    <nav className="tabs" aria-label="Secciones">
      <button className={tab === "control" ? "active" : ""} onClick={() => setTab("control")}>Panel de control</button>
      <button className={tab === "bases" ? "active" : ""} onClick={() => setTab("bases")}>Base técnica</button>
    </nav>

    {tab === "control" ? <>
      <section className="toolbar">
        <div className="toolbarTitle"><span>Vista operativa</span><strong>Año contractual {year}</strong></div>
        <label>Año<select value={year} onChange={event => setYear(event.target.value)}><option>2026</option><option>2025</option></select></label>
        <label>Categoría<select value={category} onChange={event => setCategory(event.target.value)}><option>Todas</option>{categories.map(item => <option key={item} value={item}>{displayText(item)}</option>)}</select></label>
        <label>Estado<select value={status} onChange={event => setStatus(event.target.value)}><option>Todos</option><option>Recepcionado</option><option>En curso</option></select></label>
        <label className="search">Buscar<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Provisión o destino"/></label>
      </section>

      <section className="summary">
        <article className="mainKpi">
          <div>
            <p className="eyebrow">ESTADO GENERAL</p>
            <h2>Cumplimiento<br/>contractual</h2>
            <p>{completed} provisiones completadas de {progress.length} exigibles durante {year}.</p>
          </div>
          <StatusRing value={general}/>
        </article>
        <article className="courseAlert">
          <div className="courseAlertHead">
            <div><p className="eyebrow">ALERTA DE ENTREGA</p><h2>Provisiones en curso</h2></div>
            <span>{inCourse.length} {inCourse.length === 1 ? "entrega pendiente" : "entregas pendientes"}</span>
          </div>
          <div className="courseAlertTable" role="table" aria-label="Provisiones en curso">
            <div className="courseAlertLabels" role="row">
              <span>Fecha tope</span><span>Provisión</span><span>Cantidad</span><span>Lugar de despacho</span><span>Alerta</span>
            </div>
            {inCourse.map(item => {
              const alert = urgency(item.days);
              return <div className="courseAlertRow" role="row" key={item.id}>
                <span data-label="Fecha tope">{item.dueDate ? new Date(item.dueDate).toLocaleDateString("es-CL") : "Sin fecha"}</span>
                <strong data-label="Provisión">{displayText(item.provision)}</strong>
                <span data-label="Cantidad">{formatNumber.format(item.quantity)} {item.unit}</span>
                <span data-label="Lugar de despacho">{item.observations || "Sin destino informado"}</span>
                <b className={`deliveryAlert ${alert.className}`} data-label="Alerta">{alert.label}</b>
              </div>;
            })}
            {!inCourse.length && <p className="empty">No hay provisiones en curso para este año.</p>}
          </div>
        </article>      </section>

      <section className="workspace">
        <article className="progressPanel">
          <div className="panelHead">
            <div><p className="eyebrow">AVANCE ACUMULADO</p><h2>Provisiones con movimiento</h2></div>
            <span>{topProgress.length} activas</span>
          </div>
          <div className="progressList">
            {topProgress.map(item => <div className="progressItem" key={item.id}>
              <div className="progressCopy">
                <strong>{displayText(item.provision)}</strong>
                <span>{formatNumber.format(item.delivered)} de {formatNumber.format(item.annual)} {item.unit}</span>
              </div>
              <div className="track"><i style={{width: `${item.pct}%`}}/></div>
              <b>{item.pct.toFixed(0)}%</b>
            </div>)}
            {!topProgress.length && <p className="empty">Todavía no existen entregas recepcionadas para este año.</p>}
          </div>
          <details>
            <summary>Ver las {progress.length} provisiones contractuales</summary>
            <div className="allProvisions">{progress.map(item => <div key={item.id}><i data-state={item.pct >= 100 ? "done" : item.pct > 0 ? "active" : "idle"}/><span>{displayText(item.provision)}</span><b>{item.pct.toFixed(0)}%</b></div>)}</div>
          </details>
        </article>

        <aside className="fieldPanel">
          <div className="fieldPhoto"><img src="/contrato/area-verde.jpeg" alt="Área verde mantenida en el contrato"/><span>Registro de terreno</span></div>
          <div className="courseHead"><div><p className="eyebrow">ATENCIÓN REQUERIDA</p><h2>Provisiones en curso</h2></div><b>{inCourse.length}</b></div>
          <div className="courseList">
            {inCourse.map(item => <article key={item.id}>
              <span className="courseDot"/>
              <div><strong>{displayText(item.provision)}</strong><small>{item.observations || "Sin destino informado"}</small></div>
              <div className="courseAmount"><b>{formatNumber.format(item.quantity)} {item.unit}</b><small>{item.dueDate ? new Date(item.dueDate).toLocaleDateString("es-CL") : "Sin plazo"}</small></div>
            </article>)}
            {!inCourse.length && <p className="empty">No hay solicitudes abiertas para este año.</p>}
          </div>
        </aside>
      </section>

      <section className="movements">
        <div className="panelHead">
          <div><p className="eyebrow">TRAZABILIDAD</p><h2>Detalle de movimientos</h2></div>
          <span>{movements.length} registros</span>
        </div>
        <div className="tableWrap"><table>
          <thead><tr><th>Provisión</th><th>Cantidad</th><th>Solicitud</th><th>Plazo</th><th>Estado</th><th>Destino / observación</th></tr></thead>
          <tbody>{movements.map(item => <tr key={item.id}>
            <td><strong>{displayText(item.provision)}</strong><small>{item.id}</small></td>
            <td>{formatNumber.format(item.quantity)} {item.unit}</td>
            <td>{item.requestDate ? new Date(item.requestDate).toLocaleDateString("es-CL") : "—"}</td>
            <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString("es-CL") : "—"}</td>
            <td><span className={isReceived(item.status) ? "badge ok" : "badge open"}>{item.status}</span></td>
            <td>{item.observations || "—"}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </> : <section className="technical">
      <div className="technicalHero">
        <img src="/contrato/parque.jpeg" alt="Vista aérea de parque incluido en el contrato"/>
        <div><p className="eyebrow light">RESPALDO CONTRACTUAL</p><h2>La base técnica,<br/>sin doble lectura.</h2><p>Consulta el texto original, su numeral y la página impresa correspondiente a cada familia de provisiones.</p><a href="/base-tecnica/bases-tecnicas-zona-6.pdf" target="_blank" rel="noreferrer">Abrir PDF completo <ArrowIcon/></a></div>
      </div>
      <div className="docGrid">{technicalDocs.map(document => <article key={document.title}>
        <img src={`/base-tecnica/${document.image}`} alt={`Extracto de la base técnica sobre ${document.title}`}/>
        <div><p className="eyebrow">NUMERAL {document.section}</p><h3>{document.title}</h3><span>Páginas impresas {document.printed}</span><a href={`/base-tecnica/bases-tecnicas-zona-6.pdf#page=${document.pdf}`} target="_blank" rel="noreferrer">Ver página exacta <ArrowIcon/></a></div>
      </article>)}</div>
    </section>}

    <footer><span>Fuente operativa: BI - PROVISIONES.xlsx</span><span>Vista publicada · los datos corresponden a una fotografía de la última actualización.</span></footer>
  </main>;
}

