from __future__ import annotations
import json, sys
from pathlib import Path
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs/data/provisiones.json"
OUT = ROOT / "docs/informes"
LOGOS = ROOT / "docs/assets/marca"
GREEN = colors.HexColor("#073e2d")
LIME = colors.HexColor("#c8e466")
INK = colors.HexColor("#12271f")
MUTED = colors.HexColor("#6d7972")
LINE = colors.HexColor("#dfe5de")
BLUE = colors.HexColor("#186b8f")

def received(value): return "recepcionado" in str(value).lower() or "ok" in str(value).lower()
def fmt(value):
    value = float(value or 0)
    return f"{value:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".").replace(",0", "")
def d(value):
    if not value: return "Sin fecha"
    try: return datetime.fromisoformat(str(value)[:10]).strftime("%d-%m-%Y")
    except: return str(value)
def clean(value):
    return str(value).replace("Cesped", "Césped").replace("Arboles", "Árboles").replace("Tuberia", "Tubería").replace("Valvula", "Válvula").replace("hormigon", "hormigón")

def footer(canvas, doc, year):
    canvas.saveState(); canvas.setStrokeColor(LINE); canvas.line(14*mm, 13*mm, 196*mm, 13*mm)
    canvas.setFont("Helvetica", 7); canvas.setFillColor(MUTED)
    canvas.drawString(14*mm, 8*mm, "Contrato Maipú Zona 6 - Mantención de áreas verdes")
    canvas.drawRightString(196*mm, 8*mm, f"Informe {year} - Página {doc.page}")
    canvas.restoreState()

def build(year, payload):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"informe-provisiones-maipu-zona-6-{year}.pdf"
    styles = getSampleStyleSheet()
    title = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=19, leading=21, textColor=colors.white, alignment=TA_LEFT)
    small_white = ParagraphStyle("sw", parent=styles["BodyText"], fontSize=8, leading=10, textColor=colors.white)
    section = ParagraphStyle("sec", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14, textColor=INK, spaceAfter=7)
    cell = ParagraphStyle("cell", parent=styles["BodyText"], fontSize=6.8, leading=8.2, textColor=INK)
    records = [r for r in payload["records"] if int(r.get("contractYear", 0)) == year]
    pending = [r for r in records if not received(r.get("status"))]
    progress=[]
    for base in payload["base"]:
        if float(base.get("annual",0)) <= 0: continue
        delivered=sum(float(r.get("quantity",0)) for r in records if received(r.get("status")) and r.get("category")==base.get("provision") and str(r.get("unit","")).lower()==str(base.get("unit","")).lower())
        pct=min(delivered/float(base["annual"])*100,100)
        progress.append((base,delivered,pct))
    progress.sort(key=lambda x:x[2], reverse=True)
    complete=sum(1 for _,_,pct in progress if pct>=100)
    compliance=round(complete/len(progress)*100) if progress else 0
    doc=SimpleDocTemplate(str(path), pagesize=A4, leftMargin=14*mm,rightMargin=14*mm,topMargin=12*mm,bottomMargin=18*mm,title=f"Informe de provisiones {year}",author="AKRO Diseño")
    story=[]
    logo_table=Table([[Image(str(LOGOS/"municipalidad-maipu.png"),width=34*mm,height=11*mm), Image(str(LOGOS/"akro-diseno.png"),width=30*mm,height=11*mm), [Paragraph("ECOSISTEMA INTERACTIVO 2025-2030", small_white),Paragraph("Informe de provisiones",title),Paragraph(f"Período contractual {year}",small_white)]]], colWidths=[39*mm,35*mm,104*mm])
    logo_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN),("BACKGROUND",(0,0),(1,0),colors.white),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),5*mm),("RIGHTPADDING",(0,0),(-1,-1),4*mm),("TOPPADDING",(0,0),(-1,-1),4*mm),("BOTTOMPADDING",(0,0),(-1,-1),4*mm),("BOX",(0,0),(-1,-1),0, GREEN)]))
    story += [logo_table, Spacer(1,6*mm)]
    metrics=[["Cumplimiento",f"{compliance}%"],["Entregas registradas",str(len(records))],["Recepcionadas",str(len(records)-len(pending))],["En curso",str(len(pending))]]
    mt=Table([[Paragraph(f"<font color='#6d7972' size='7'>{a}</font>",cell) for a,_ in metrics],[Paragraph(f"<font color='#12271f' size='15'><b>{b}</b></font>",cell) for _,b in metrics]],colWidths=[45.5*mm]*4,rowHeights=[8*mm,11*mm])
    mt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#f1f7f2")),("BOX",(0,0),(-1,-1),.4,LINE),("INNERGRID",(0,0),(-1,-1),.4,LINE),("LEFTPADDING",(0,0),(-1,-1),4*mm),("RIGHTPADDING",(0,0),(-1,-1),4*mm),("TOPPADDING",(0,0),(-1,0),2.5*mm),("BOTTOMPADDING",(0,1),(-1,1),2*mm)])); story += [mt,Spacer(1,7*mm),Paragraph("Entregas y solicitudes del período",section)]
    rows=[["Solicitud","Plazo","Provisión","Cantidad","Destino","Estado"]]
    for r in records: rows.append([d(r.get("requestDate")),d(r.get("dueDate")),Paragraph(clean(r.get("provision","")),cell),f"{fmt(r.get('quantity'))} {r.get('unit','')}",Paragraph(r.get("observations") or "Sin destino",cell),"Recepcionado" if received(r.get("status")) else "En curso"])
    t=Table(rows,colWidths=[18*mm,18*mm,35*mm,23*mm,61*mm,27*mm],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,0),(-1,-1),6.4),("GRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),1.8*mm)]+[("BACKGROUND",(0,i),(-1,i),colors.HexColor("#f6faf7")) for i in range(2,len(rows),2)])); story += [t,PageBreak(),Paragraph("Compromiso contractual",section),Paragraph(f"Avance acumulado de provisiones durante {year}.",styles["BodyText"]),Spacer(1,4*mm)]
    prows=[["Provisión","Total base","Entregado","Avance"]]+[[Paragraph(clean(b["provision"]),cell),f"{fmt(b['annual'])} {b['unit']}",f"{fmt(delivered)} {b['unit']}",f"{pct:.0f}%"] for b,delivered,pct in progress]
    pt=Table(prows,colWidths=[82*mm,36*mm,36*mm,28*mm],repeatRows=1)
    pt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLUE),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,0),(-1,-1),7),("GRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ALIGN",(3,1),(3,-1),"RIGHT"),("PADDING",(0,0),(-1,-1),2*mm)]+[("BACKGROUND",(0,i),(-1,i),colors.HexColor("#f1f8fb")) for i in range(2,len(prows),2)])); story.append(pt)
    doc.build(story,onFirstPage=lambda c,d: footer(c,d,year),onLaterPages=lambda c,d: footer(c,d,year)); print(path)

payload=json.loads(DATA.read_text(encoding="utf-8"))
years=sorted({int(r.get("contractYear",0)) for r in payload["records"] if r.get("contractYear")}) or [2025,2026]
for year in years: build(year,payload)

