from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = r'C:\Users\Tobias Fein\Heimprojekte\AETHER-ENTWICKLUNG\aether_dev_updates\Aether_Layoutfinalisierung.docx'
GREEN, PALE, PALE2, GRAY = '35553E', 'EEF3ED', 'F7F9F6', 'D9D9D9'
TEXT, MUTED = '222922', '667066'

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.27), Inches(11.69)
sec.top_margin, sec.bottom_margin = Inches(.68), Inches(.68)
sec.left_margin, sec.right_margin = Inches(.78), Inches(.78)
sec.header_distance = sec.footer_distance = Inches(.32)
normal = doc.styles['Normal']
normal.font.name, normal.font.size = 'Aptos', Pt(10)
normal.font.color.rgb = RGBColor.from_string(TEXT)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12
for name, size in [('Title',27),('Heading 1',18),('Heading 2',12)]:
    s=doc.styles[name]; s.font.name='Aptos Display' if name!='Heading 2' else 'Aptos'
    s.font.size=Pt(size); s.font.bold=name!='Title'; s.font.color.rgb=RGBColor(0,0,0)
    s.paragraph_format.space_before=Pt(8 if name!='Title' else 0); s.paragraph_format.space_after=Pt(6)
title_ppr=doc.styles['Title']._element.get_or_add_pPr()
title_border=title_ppr.find(qn('w:pBdr'))
if title_border is not None: title_ppr.remove(title_border)

def shade(cell, fill):
    sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),fill); cell._tc.get_or_add_tcPr().append(sh)
def margins(cell):
    tcpr=cell._tc.get_or_add_tcPr(); mar=OxmlElement('w:tcMar')
    for side,val in [('top',105),('start',125),('bottom',105),('end',125)]:
        e=OxmlElement('w:'+side); e.set(qn('w:w'),str(val)); e.set(qn('w:type'),'dxa'); mar.append(e)
    tcpr.append(mar)
def borders(table):
    b=OxmlElement('w:tblBorders')
    for side in ('top','left','bottom','right','insideH','insideV'):
        e=OxmlElement('w:'+side); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'6'); e.set(qn('w:color'),GRAY); b.append(e)
    table._tbl.tblPr.append(b)
def text(cell, value, bold=False, color=TEXT, size=8.5):
    cell.text=''; p=cell.paragraphs[0]; p.paragraph_format.space_after=Pt(1); p.paragraph_format.line_spacing=1.08
    r=p.add_run(value); r.font.name='Aptos'; r.font.size=Pt(size); r.font.bold=bold; r.font.color.rgb=RGBColor.from_string(color)
def format_table(t, widths, header=False):
    t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False; borders(t)
    for ri,row in enumerate(t.rows):
        for ci,c in enumerate(row.cells):
            c.width=Inches(widths[ci]); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; margins(c)
            if header and ri==0:
                shade(c,GREEN)
                for r in c.paragraphs[0].runs: r.font.bold=True; r.font.color.rgb=RGBColor(255,255,255)
            elif ri%2==0: shade(c,PALE2)
    if header:
        tr=OxmlElement('w:tblHeader'); tr.set(qn('w:val'),'true'); t.rows[0]._tr.get_or_add_trPr().append(tr)
def bullet(lead, rest):
    p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.left_indent=Inches(.24); p.paragraph_format.first_line_indent=Inches(-.16); p.paragraph_format.space_after=Pt(4)
    p.add_run(lead).bold=True; p.add_run(rest)
def field(label):
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(6)
    a=p.add_run(label+'  '); a.bold=True; a.font.size=Pt(9)
    b=p.add_run('____________________________________________'); b.font.size=Pt(9); b.font.color.rgb=RGBColor.from_string(MUTED)

header=sec.header.paragraphs[0]; header.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=header.add_run('AETHER  /  PROJEKTNOTIZEN'); r.font.size=Pt(8); r.font.bold=True; r.font.color.rgb=RGBColor.from_string(MUTED)
footer=sec.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=footer.add_run('Aether Layoutfinalisierung   ·   '); r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string(MUTED)
page=OxmlElement('w:fldSimple'); page.set(qn('w:instr'),'PAGE'); footer._p.append(page)

# Stammdatenblatt
p=doc.add_paragraph(style='Title'); p.add_run('Aether Layoutfinalisierung')
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(14)
r=p.add_run('Stammdatenblatt, Layoutdokumentation und Notizbereich'); r.font.size=Pt(11); r.font.color.rgb=RGBColor.from_string(MUTED)
doc.add_paragraph('Dieses Dokument beschreibt die überarbeiteten Anordnungen „Uhr rechts“ und „Gestapelt“ für die Aether-New-Tab-Seite. Es hält die Layoutregeln fest und bietet Felder für Projektpflege, Abnahme und spätere Notizen.')
doc.add_heading('Projektstammdaten',level=1)
t=doc.add_table(rows=5,cols=4)
data=[('Projekt','Aether Browser-Erweiterung','Dokumentdatum','23.11.2026'),('Bereich','New-Tab-Layout','Projektversion','1.1.0'),('Layoutvarianten','Uhr rechts und Gestapelt','Zielbrowser','Brave und Chromium'),('Bearbeitung','________________________','Abnahme durch','________________________'),('Status','Umgesetzt, visuelle Abnahme offen','Revision / Release','________________________')]
for i,row in enumerate(data):
    for j,v in enumerate(row): text(t.cell(i,j),v,bold=j in (0,2),color=GREEN if j in (0,2) else TEXT,size=8.2)
format_table(t,[1.0,2.35,1.05,2.31])
doc.add_heading('Ziel und Ergebnis',level=1)
doc.add_paragraph('Die Suchleiste behält in der rechten Anordnung eine ausreichend breite Hauptspalte, während Uhr und Lesezeichen eine kompakte Seitenleiste bilden. Im gestapelten Layout steht die Suche zentriert oben; Uhr und Lesezeichen erhalten darunter eine eigene, klar gegliederte Zeile. Bei schmalen Ansichten wächst der Inhalt in die Höhe, statt gequetscht oder abgeschnitten zu werden.')
doc.add_heading('Dokumentpflege',level=2)
doc.add_paragraph('Stammdaten können für weitere Entwicklungsstände aktualisiert werden. Abnahmebeobachtungen und offene Fragen gehören in den Notizbereich. Die technische Dokumentation beschreibt die derzeit implementierten Regeln.')

# Dokumentation
doc.add_page_break(); doc.add_heading('Layoutdokumentation',level=1)
doc.add_paragraph('Die Anpassung betrifft die CSS-Anordnung der Startseite. Sie verteilt Suche, Uhr und Lesezeichen für die beiden Layoutoptionen neu, ohne deren Inhalte oder Funktionen zu ändern.')
t=doc.add_table(rows=1,cols=4)
for j,v in enumerate(['Ansicht','Spalten und Position','Abstandslogik','Schmale Ansicht']): text(t.cell(0,j),v,True,'FFFFFF',8)
rows=[('Uhr rechts','Flexible Suchspalte links; Uhr und Lesezeichen rechts in einer Seitenleiste.','Seitenleiste folgt der konfigurierten Breite mit mindestens 220 px. Der Spaltenspalt wächst responsiv zwischen 30 und 58 px. Die Suche richtet sich am inneren Rand der Hauptspalte aus.','Suche oben, Seitenleiste darunter. Der Seitenleisten-Trenner entfällt.'),('Gestapelt','Suche zentriert in der oberen Zeile. Darunter Uhr links und Lesezeichen rechts.','Untere Reihe mit 0,82 / 1,18 Anteilen. Der Lesezeichenbereich erhält mehr Breite; Abstände wachsen responsiv.','Bis 560 px bleiben Uhr und Lesezeichen nebeneinander. Darunter wechseln sie untereinander. Die Seite darf scrollen.')]
for row in rows:
    cells=t.add_row().cells
    for j,v in enumerate(row): text(cells[j],v,size=7.8)
format_table(t,[.86,1.6,2.5,1.75],True)
doc.add_heading('Uhr rechts',level=2)
bullet('Hauptspalte. ','Das Grid gibt der Suche den flexiblen Bereich und der Seitenleiste die konfigurierte Breite; auf schmaleren Desktopfenstern bleibt die Seitenleiste mindestens 220 px breit.')
bullet('Ausrichtung. ','Die Seitenleiste liegt rechts und ist durch einen linken Rand abgesetzt. Die Suchleiste wird innerhalb der Hauptspalte rechts ausgerichtet und bleibt auf ihre eingestellte Maximalbreite begrenzt.')
doc.add_heading('Gestapelt',level=2)
bullet('Obere Zeile. ','Die Suche erhält eine eigene Zeile und wird in der verfügbaren Breite zentriert.')
bullet('Untere Zeile. ','Uhr und Lesezeichen stehen nebeneinander. Die Breitenanteile von 0,82 zu 1,18 geben dem Lesezeichenbereich mehr Raum.')
bullet('Kleine Fenster. ','Bei wenig Höhe wächst die Seite und kann scrollen. Unter 560 px stehen Uhr und Lesezeichen untereinander.')
doc.add_heading('Betroffene Dateien',level=2)
t=doc.add_table(rows=1,cols=2); text(t.cell(0,0),'Datei',True,'FFFFFF'); text(t.cell(0,1),'Zweck',True,'FFFFFF')
for a,b in [('css/style.css','Responsive Spaltenverhältnisse, Positionierung, Abstände, Trenner und Scrollverhalten.'),('settings.html','Unverändert; die bestehenden Layoutoptionen bleiben erhalten.'),('newtab.html / js/start.js','Unverändert; bestehende Bereiche und Layout-Dateneigenschaften werden weiterverwendet.')]:
    c=t.add_row().cells; text(c[0],a,size=8); text(c[1],b,size=8)
format_table(t,[1.95,4.76],True)
doc.add_heading('Abnahmecheck',level=2)
t=doc.add_table(rows=1,cols=3)
for j,v in enumerate(['Prüfpunkt','Ergebnis','Notiz']): text(t.cell(0,j),v,True,'FFFFFF',8)
for v in ['Standardlayout bleibt unverändert','Uhr rechts bei 1440 px und 900 px','Gestapelt bei 1440 × 900 px','Gestapelt bei 780 px und unter 560 px','Lesezeichenordner und „mehr anzeigen“']:
    c=t.add_row().cells; text(c[0],v,size=7.8); text(c[1],'☐ Offen / ☐ Erledigt',color=MUTED,size=7.8); text(c[2],'____________________',color=MUTED,size=7.8)
format_table(t,[3.25,1.5,1.96],True)

# Notizbereich
doc.add_page_break(); doc.add_heading('Notizbereich',level=1)
doc.add_paragraph('Für Abnahmebeobachtungen, Fehlerbilder, Ideen und spätere Layoutanpassungen.')
field('Datum'); field('Ansicht / Fenstergröße'); field('Thema')
doc.add_heading('Beobachtungen und offene Punkte',level=2)
for _ in range(13):
    p=doc.add_paragraph(' '); p.paragraph_format.space_after=Pt(4); p.paragraph_format.line_spacing=1.2
    ppr=p._p.get_or_add_pPr(); pb=OxmlElement('w:pBdr'); bot=OxmlElement('w:bottom')
    bot.set(qn('w:val'),'single'); bot.set(qn('w:sz'),'4'); bot.set(qn('w:space'),'2'); bot.set(qn('w:color'),GRAY); pb.append(bot); ppr.append(pb)
doc.add_heading('Nächste Schritte',level=2); field('Verantwortlich'); field('Termin / Release')

doc.core_properties.title='Aether Layoutfinalisierung'
doc.core_properties.subject='Stammdatenblatt, Layoutdokumentation und Notizen'
doc.core_properties.author=''
doc.save(OUT)
print(OUT)
