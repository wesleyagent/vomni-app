from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import re

# ── colours ──────────────────────────────────────────────────────────────────
GREEN   = colors.HexColor("#00C896")
NAVY    = colors.HexColor("#0A0F1E")
GREY    = colors.HexColor("#6B7280")
BORDER  = colors.HexColor("#E5E7EB")
BGLIGHT = colors.HexColor("#F7F8FA")
CODE_BG = colors.HexColor("#1E293B")
CODE_FG = colors.HexColor("#E2E8F0")

# ── styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

DOC_TITLE = S("DocTitle",  fontName="Helvetica-Bold", fontSize=28, textColor=NAVY,
               leading=36, spaceAfter=4)
DOC_SUB   = S("DocSub",   fontName="Helvetica",      fontSize=11, textColor=GREY,
               leading=16, spaceAfter=20)
H1        = S("H1",       fontName="Helvetica-Bold", fontSize=18, textColor=NAVY,
               leading=24, spaceBefore=20, spaceAfter=6)
H2        = S("H2",       fontName="Helvetica-Bold", fontSize=13, textColor=GREEN,
               leading=18, spaceBefore=14, spaceAfter=4)
H3        = S("H3",       fontName="Helvetica-Bold", fontSize=11, textColor=NAVY,
               leading=15, spaceBefore=10, spaceAfter=3)
BODY      = S("Body",     fontName="Helvetica",      fontSize=9,  textColor=NAVY,
               leading=14, spaceAfter=4)
BULLET    = S("Bullet",   fontName="Helvetica",      fontSize=9,  textColor=NAVY,
               leading=14, leftIndent=14, spaceAfter=2, bulletIndent=4)
CODE      = S("Code",     fontName="Courier",        fontSize=7.5, textColor=CODE_FG,
               leading=11, backColor=CODE_BG, leftIndent=8, rightIndent=8,
               spaceBefore=4, spaceAfter=4)

def make_table(rows, col_widths=None):
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  GREEN),
        ("TEXTCOLOR",    (0,0), (-1,0),  colors.white),
        ("FONTNAME",     (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,0),  8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, BGLIGHT]),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,1), (-1,-1), 8),
        ("TEXTCOLOR",    (0,1), (-1,-1), NAVY),
        ("GRID",         (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]))
    return tbl

# ── parse markdown ────────────────────────────────────────────────────────────
def escape(txt):
    txt = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return txt

def parse_md(md_text):
    story = []
    lines = md_text.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]

        # fenced code block
        if line.strip().startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(escape(lines[i]))
                i += 1
            i += 1
            block = "<br/>".join(code_lines) if code_lines else " "
            story.append(Paragraph(block, CODE))
            continue

        # horizontal rule
        if re.match(r"^---+$", line.strip()):
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
            story.append(Spacer(1, 4))
            i += 1
            continue

        # markdown table
        if line.strip().startswith("|") and i + 1 < len(lines) and re.match(r"^\|[-| :]+\|", lines[i+1].strip()):
            header_cells = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2  # skip separator
            rows = [[Paragraph(f"<b>{escape(c)}</b>", S("TH", fontName="Helvetica-Bold",
                       fontSize=8, textColor=colors.white, leading=11)) for c in header_cells]]
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                # pad if needed
                while len(cells) < len(header_cells):
                    cells.append("")
                rows.append([Paragraph(escape(c), S("TC", fontName="Helvetica",
                              fontSize=8, textColor=NAVY, leading=11)) for c in cells[:len(header_cells)]])
                i += 1
            n_cols = len(header_cells)
            avail = 170 * mm
            col_w = [avail / n_cols] * n_cols
            story.append(Spacer(1, 4))
            story.append(make_table(rows, col_w))
            story.append(Spacer(1, 6))
            continue

        # headings
        m = re.match(r"^(#{1,4})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            text  = escape(m.group(2))
            if level == 1:
                # Check if it's the very first H1 (document title)
                if not story:
                    story.append(Paragraph(text, DOC_TITLE))
                else:
                    story.append(PageBreak())
                    story.append(Paragraph(text, H1))
                    story.append(HRFlowable(width="100%", thickness=2, color=GREEN))
                    story.append(Spacer(1, 4))
            elif level == 2:
                story.append(Paragraph(text, H2))
            elif level == 3:
                story.append(Paragraph(text, H3))
            else:
                story.append(Paragraph(f"<b>{text}</b>", BODY))
            i += 1
            continue

        # bold inline for key-value lines like "**Version**: 1.0"
        if line.startswith("**") and not line.startswith("**Step"):
            text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(line))
            story.append(Paragraph(text, S("MetaLine", fontName="Helvetica", fontSize=9,
                                            textColor=GREY, leading=14, spaceAfter=2)))
            i += 1
            continue

        # bullet
        if re.match(r"^[-*]\s+", line):
            text = re.sub(r"^[-*]\s+", "", line)
            text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(text))
            text = re.sub(r"`(.+?)`", r'<font name="Courier" size="8">\1</font>', text)
            story.append(Paragraph(f"• {text}", BULLET))
            i += 1
            continue

        # numbered list
        if re.match(r"^\d+\.\s+", line):
            text = re.sub(r"^\d+\.\s+", "", line)
            text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(text))
            story.append(Paragraph(f"• {text}", BULLET))
            i += 1
            continue

        # blank line
        if not line.strip():
            story.append(Spacer(1, 4))
            i += 1
            continue

        # normal paragraph
        text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(line))
        text = re.sub(r"`(.+?)`", r'<font name="Courier" size="8">\1</font>', text)
        story.append(Paragraph(text, BODY))
        i += 1

    return story

# ── header / footer ───────────────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    # header bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 28*mm, w, 28*mm, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(20*mm, h - 16*mm, "Vomni")
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(40*mm, h - 16*mm, "— Technical Specification")
    # footer
    canvas.setFillColor(BORDER)
    canvas.rect(0, 0, w, 10*mm, fill=1, stroke=0)
    canvas.setFillColor(GREY)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(20*mm, 3.5*mm, "Confidential — Vomni © 2026")
    canvas.drawRightString(w - 20*mm, 3.5*mm, f"Page {doc.page}")
    canvas.restoreState()

# ── build ─────────────────────────────────────────────────────────────────────
with open("/Users/nickyleslie/Desktop/Wesley/vomni-app/TECH_SPEC.md", "r") as f:
    md = f.read()

OUT = "/Users/nickyleslie/Desktop/Vomni_Tech_Spec.pdf"

doc = SimpleDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm,
    topMargin=34*mm, bottomMargin=18*mm,
    title="Vomni Technical Specification",
    author="Vomni",
)

story = parse_md(md)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF saved to: {OUT}")
