"use client";
import {useEffect,useMemo,useState} from "react";
type B={id:string;provision:string;annual:number;unit:string};
type R={id:string;contractYear:number;requestDate:string|null;dueDate:string|null;provision:string;category:string;quantity:number;unit:string;status:string;observations:string};
type D={generatedAt:string;base:B[];records:R[]};
const fmt=new Intl.NumberFormat("es-CL",{maximumFractionDigits:1});
const received=(s:string)=>/ok|recepcionado/i.test(s);
const baseDocs=[
 {title:"Césped",section:"3.7.3.9",printed:"21–22",pdf:22,image:"cesped.webp"},
 {title:"Árboles y arbustos",section:"3.7.4.5",printed:"24–28",pdf:25,image:"arboles-arbustos.webp"},
 {title:"Florales y semillas",section:"3.7.7.1.5–1.6",printed:"31–34",pdf:32,image:"florales-semillas.webp"},
 {title:"Fertilización",section:"3.7.8.1",printed:"35",pdf:36,image:"fertilizacion.webp"},
 {title:"Riego y PVC",section:"3.8.4.2–4.4",printed:"40–43",pdf:41,image:"riego-pvc.webp"},
 {title:"Áridos",section:"3.9.2",printed:"45–46",pdf:46,image:"aridos.webp"},
];
export default function Home(){
 const[data,setData]=useState<D|null>(null),[tab,setTab]=useState<"control"|"bases">("control"),[year,setYear]=useState("2026"),[status,setStatus]=useState("Todos"),[category,setCategory]=useState("Todas"),[query,setQuery]=useState("");
 useEffect(()=>{fetch("/data/provisiones.json").then(r=>r.json()).then(setData)},[]);
 const y=Number(year),categories=useMemo(()=>data?[...new Set(data.base.map(x=>x.provision))]:[],[data]);
 const movements=useMemo(()=>data?.records.filter(r=>String(r.contractYear)===year&&(status==="Todos"||(status==="Recepcionado"?received(r.status):!received(r.status)))&&(category==="Todas"||r.category===category)&&`${r.provision} ${r.observations}`.toLowerCase().includes(query.toLowerCase()))||[],[data,year,status,category,query]);
 const progress=useMemo(()=>data?.base.filter(b=>b.annual>0).map(b=>{const delivered=data.records.filter(r=>r.contractYear===y&&received(r.status)&&r.category===b.provision&&r.unit.toLowerCase()===b.unit.toLowerCase()).reduce((a,r)=>a+r.quantity,0);return{...b,delivered,pct:b.annual?Math.min(delivered/b.annual*100,100):0}}).sort((a,b)=>b.pct-a.pct)||[],[data,y]);
 const inCourse=data?.records.filter(r=>r.contractYear===y&&!received(r.status))||[];
 const complete=progress.filter(p=>p.pct>=100).length,general=progress.length?complete/progress.length*100:0;
 const overdue=inCourse.filter(r=>r.dueDate&&new Date(r.dueDate)<new Date()).length;
 if(!data)return <main className="loading">Preparando provisiones…</main>;
 return <main>
  <header className="header"><div><p className="kicker">MAIPÚ · ZONA 6</p><h1>Control de provisiones</h1><p className="contract">Según Bases Técnicas Generales de Licitación 2024 del “Servicio de Mantención de Áreas Verdes, Mejoramiento Continuo y Zonas Especiales de la Comuna de Maipú”.</p></div><div className="update"><span>Última actualización</span><strong>{new Date(data.generatedAt).toLocaleDateString("es-CL")}</strong></div></header>
  <nav className="tabs" aria-label="Secciones"><button className={tab==="control"?"active":""} onClick={()=>setTab("control")}>Control de provisiones</button><button className={tab==="bases"?"active":""} onClick={()=>setTab("bases")}>Ver base técnica</button></nav>
  {tab==="control"?<>
   <section className="filters"><label>Año contractual<select value={year} onChange={e=>setYear(e.target.value)}><option>2026</option><option>2025</option></select></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Recepcionado</option><option>En curso</option></select></label><label>Buscar provisión<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o destino…"/></label></section>
   <section className="kpis"><article><span>Cumplimiento general</span><strong>{general.toFixed(0)}%</strong><small>{complete} de {progress.length} provisiones completas</small></article><article><span>Pendientes</span><strong>{inCourse.length}</strong><small>Solicitudes todavía abiertas</small></article><article className={overdue?"danger":""}><span>Plazos vencidos</span><strong>{overdue}</strong><small>Sin recepción conforme</small></article></section>
   <section className="overview"><div className="provisions"><div className="sectionTitle"><div><p className="kicker">AVANCE CONTRACTUAL</p><h2>Todas las provisiones</h2></div><span>{year}</span></div><div className="provisionGrid">{progress.map(p=><article key={p.id}><div className="dot" data-complete={p.pct>=100}/><div><strong>{p.provision}</strong><small>{fmt.format(p.delivered)} / {fmt.format(p.annual)} {p.unit}</small></div><b>{p.pct.toFixed(0)}%</b></article>)}</div></div>
    <aside className="course"><div className="sectionTitle"><div><p className="kicker">SEGUIMIENTO</p><h2>Provisiones en curso</h2></div><b>{inCourse.length}</b></div>{inCourse.length?inCourse.map(r=><article key={r.id}><strong>{r.provision}</strong><span>{fmt.format(r.quantity)} {r.unit}</span><small>{r.observations||"Sin destino informado"}</small><em>{r.dueDate?`Plazo ${new Date(r.dueDate).toLocaleDateString("es-CL")}`:"Sin fecha de plazo"}</em></article>):<p className="empty">No hay solicitudes abiertas para este año.</p>}</aside>
   </section>
   <section className="movements"><div className="sectionTitle"><div><p className="kicker">TRAZABILIDAD</p><h2>Detalle de movimientos</h2></div><span>{movements.length} registros</span></div><div className="tableWrap"><table><thead><tr><th>Provisión</th><th>Cantidad</th><th>Solicitud</th><th>Plazo</th><th>Estado</th><th>Destino / observación</th></tr></thead><tbody>{movements.map(r=><tr key={r.id}><td><strong>{r.provision}</strong><small>{r.id}</small></td><td>{fmt.format(r.quantity)} {r.unit}</td><td>{r.requestDate?new Date(r.requestDate).toLocaleDateString("es-CL"):"—"}</td><td>{r.dueDate?new Date(r.dueDate).toLocaleDateString("es-CL"):"—"}</td><td><span className={received(r.status)?"badge ok":"badge open"}>{r.status}</span></td><td>{r.observations||"—"}</td></tr>)}</tbody></table></div></section>
  </>:<section className="technical"><div className="technicalIntro"><div><p className="kicker">RESPALDO CONTRACTUAL</p><h2>Base técnica de provisiones</h2><p>Cada cuadro conserva una imagen literal, el numeral y la página impresa. El botón abre el PDF directamente en la página correspondiente.</p></div><a className="pdfButton" href="/base-tecnica/bases-tecnicas-zona-6.pdf" target="_blank" rel="noreferrer">Abrir PDF completo</a></div><div className="docGrid">{baseDocs.map(d=><article key={d.title}><img src={`/base-tecnica/${d.image}`} alt={`Extracto de la base técnica sobre ${d.title}`}/><div><p className="kicker">NUMERAL {d.section}</p><h3>{d.title}</h3><span>Páginas impresas {d.printed}</span><a href={`/base-tecnica/bases-tecnicas-zona-6.pdf#page=${d.pdf}`} target="_blank" rel="noreferrer">Ver página exacta →</a></div></article>)}</div></section>}
  <footer><span>Fuente operativa: BI - PROVISIONES.xlsx</span><span>Los saldos se descuentan sólo con recepción conforme.</span></footer>
 </main>
}
