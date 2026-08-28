"""Architecture slide (diagram v3) as editable PowerPoint shapes."""

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import nsmap, qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

OUT = (
    r"c:\Users\user\Desktop\AI-Traffic-Insight-Platform"
    r"\AI-Traffic-Insight-Platform"
    r"\ai-traffic-insight-architecture-deploy(3).pptx"
)

GREEN = RGBColor(0x0D, 0x94, 0x88)
GREEN_BG = RGBColor(0xEC, 0xFD, 0xF5)
BLUE = RGBColor(0x25, 0x63, 0xEB)
BLUE_BG = RGBColor(0xEF, 0xF6, 0xFF)
PURPLE = RGBColor(0x7C, 0x3A, 0xED)
PURPLE_BG = RGBColor(0xF5, 0xF3, 0xFF)
MYSQL = RGBColor(0x0E, 0xA5, 0xE9)
MYSQL_BG = RGBColor(0xE0, 0xF2, 0xFE)
INK = RGBColor(0x1E, 0x29, 0x3B)
MUTED = RGBColor(0x47, 0x55, 0x69)
LINE = RGBColor(0x64, 0x74, 0x8B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LAYER = RGBColor(0xBF, 0xDB, 0xFE)
DEPLOY_BG = RGBColor(0xF0, 0xF9, 0xFF)
ORANGE = RGBColor(0xEA, 0x58, 0x0C)


def set_fill(shape, rgb):
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb


def set_line(shape, rgb, pt=1.25):
    shape.line.color.rgb = rgb
    shape.line.width = Pt(pt)


def no_line(shape):
    shape.line.fill.background()


def set_run(run, text, size, bold=False, color=INK, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_text(shape, lines, size=11, bold=False, color=INK, align=PP_ALIGN.LEFT, font="Calibri"):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.clear()
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(2)
        run = p.add_run()
        set_run(run, line, size, bold=bold if i == 0 else False, color=color, font=font)


def add_rr(slide, l, t, w, h, fill, line=None, name="shape"):
    s = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(l), Inches(t), Inches(w), Inches(h)
    )
    s.name = name
    set_fill(s, fill)
    if line:
        set_line(s, line)
    else:
        no_line(s)
    # tighter corners
    s.adjustments[0] = 0.12
    return s


def add_oval(slide, l, t, w, h, fill, line, name="oval"):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(l), Inches(t), Inches(w), Inches(h))
    s.name = name
    set_fill(s, fill)
    set_line(s, line, 1.5)
    return s


def add_tb(slide, l, t, w, h, lines, size=11, bold=False, color=INK, align=PP_ALIGN.LEFT, name="text"):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    box.name = name
    add_text(box, lines, size=size, bold=bold, color=color, align=align)
    return box


def add_elbow(slide, name, points):
    """Orthogonal connector as a freeform-like series of straight connectors."""
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        c = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            Inches(x1),
            Inches(y1),
            Inches(x2),
            Inches(y2),
        )
        c.name = f"{name}_{i}"
        c.line.color.rgb = LINE
        c.line.width = Pt(1.5)


def add_arrow_line(slide, name, x1, y1, x2, y2):
    c = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT,
        Inches(x1),
        Inches(y1),
        Inches(x2),
        Inches(y2),
    )
    c.name = name
    c.line.color.rgb = LINE
    c.line.width = Pt(1.5)
    # arrow head
    ln = c.line._get_or_add_ln()
    tail = etree.SubElement(ln, qn("a:tailEnd"))
    tail.set("type", "triangle")
    tail.set("w", "med")
    tail.set("len", "med")
    return c


def add_double_line(slide, name, x1, y1, x2, y2):
    c = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT,
        Inches(x1),
        Inches(y1),
        Inches(x2),
        Inches(y2),
    )
    c.name = name
    c.line.color.rgb = LINE
    c.line.width = Pt(1.5)
    ln = c.line._get_or_add_ln()
    for tag in ("a:headEnd", "a:tailEnd"):
        el = etree.SubElement(ln, qn(tag))
        el.set("type", "triangle")
        el.set("w", "med")
        el.set("len", "med")
    return c


def card(slide, l, t, w, h, header, badge, body, accent, bg, name):
    add_rr(slide, l, t, w, h, bg, accent, name=name)
    head = add_rr(slide, l, t, w, 0.42, accent, name=f"{name}_header")
    no_line(head)
    add_tb(
        slide, l + 0.12, t + 0.04, w - 0.2, 0.36,
        [header], size=14, bold=True, color=WHITE, name=f"{name}_title",
    )
    add_rr(slide, l + 0.12, t + 0.50, 1.85, 0.26, WHITE, accent, name=f"{name}_badge")
    add_tb(
        slide, l + 0.14, t + 0.50, 1.82, 0.26,
        [badge], size=9, bold=True, color=accent, align=PP_ALIGN.CENTER, name=f"{name}_badge_t",
    )
    add_tb(slide, l + 0.12, t + 0.82, w - 0.22, h - 0.95, body, size=11, color=INK, name=f"{name}_body")


def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.shapes.title  # none
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5)
    )
    bg.name = "background"
    set_fill(bg, WHITE)
    no_line(bg)

    # Application Layer (inner)
    layer = add_rr(slide, 1.28, 0.12, 10.55, 4.62, RGBColor(0xF8, 0xFA, 0xFC), LAYER, "ApplicationLayer")
    add_tb(slide, 1.40, 0.16, 3.2, 0.28, ["Application Layer"], size=11, bold=True, color=BLUE, name="layer_label")

    # Cards
    card(
        slide, 1.45, 0.48, 3.25, 2.72,
        "Frontend  :5173",
        "GitHub Pages",
        [
            "React 19 · Vite · TypeScript",
            "React Router · Zustand",
            "",
            "Dashboards, Auth, Reports",
            "Kakao Map UI",
        ],
        GREEN, GREEN_BG, "Frontend",
    )
    card(
        slide, 4.90, 0.48, 3.40, 2.72,
        "Backend  :5000",
        "AWS Lightsail",
        [
            "Nginx (Let's Encrypt)",
            "Express 5 · TypeScript",
            "JWT · bcrypt · Prisma",
            "",
            "REST API · Consultation save",
            "Rider rules · Playwright PDF",
        ],
        BLUE, BLUE_BG, "Backend",
    )
    card(
        slide, 8.50, 0.48, 3.15, 2.72,
        "AI Service  :8000",
        "AWS Lightsail",
        [
            "FastAPI · Uvicorn",
            "Python 3.11",
            "",
            ".pkl InsureGuard / GovGuard",
            "Hotspot cache · Batch / ETL",
            "별도 Lightsail 인스턴스",
        ],
        PURPLE, PURPLE_BG, "AI",
    )

    # MySQL
    mysql = add_rr(slide, 4.90, 3.38, 6.75, 1.18, MYSQL_BG, MYSQL, "MySQL")
    add_tb(
        slide, 5.05, 3.46, 6.45, 1.00,
        ["MySQL  /  AWS Lightsail", "users  ·  customers  ·  consultations  ·  gov_forecast_*"],
        size=13, bold=True, color=RGBColor(0x0C, 0x4A, 0x6E), align=PP_ALIGN.CENTER, name="MySQL_text",
    )

    # Internal arrows
    add_double_line(slide, "REST_JWT", 4.70, 1.70, 4.90, 1.70)
    add_tb(slide, 4.55, 1.38, 0.90, 0.28, ["REST / JWT"], size=8, color=MUTED, align=PP_ALIGN.CENTER, name="lbl_rest")

    add_double_line(slide, "HTTP_BE_AI", 8.30, 1.70, 8.50, 1.70)
    add_tb(slide, 8.15, 1.38, 0.70, 0.28, ["HTTP"], size=8, color=MUTED, align=PP_ALIGN.CENTER, name="lbl_http")

    add_double_line(slide, "Prisma", 6.55, 3.20, 6.55, 3.38)
    add_tb(slide, 6.65, 3.18, 0.70, 0.22, ["Prisma"], size=8, color=BLUE, name="lbl_prisma")

    add_arrow_line(slide, "batch_INSERT", 10.05, 3.20, 10.05, 3.38)
    add_tb(slide, 10.15, 3.16, 1.05, 0.22, ["batch INSERT"], size=8, color=PURPLE, name="lbl_batch")

    # External APIs OUTSIDE layer
    kakao = add_oval(slide, 0.10, 1.15, 1.05, 1.05, RGBColor(0xFE, 0xF3, 0xC7), RGBColor(0xF5, 0x9E, 0x0B), "KakaoMapAPI")
    add_tb(slide, 0.08, 2.22, 1.12, 0.45, ["Kakao Map", "API"], size=10, bold=True, color=INK, align=PP_ALIGN.CENTER, name="Kakao_lbl")
    add_elbow(slide, "kakao_to_fe", [(1.15, 1.67), (1.45, 1.67)])

    taas = add_oval(slide, 12.10, 1.15, 1.08, 1.05, RGBColor(0xE0, 0xE7, 0xFF), RGBColor(0x4F, 0x46, 0xE5), "TAAS_KOROAD")
    add_tb(slide, 11.95, 2.22, 1.30, 0.50, ["TAAS / KOROAD", "OpenAPI"], size=9, bold=True, color=INK, align=PP_ALIGN.CENTER, name="TAAS_lbl")
    add_elbow(slide, "taas_to_ai", [(12.10, 1.67), (11.65, 1.67)])

    gem = add_oval(slide, 5.05, 4.82, 0.72, 0.72, RGBColor(0xEE, 0xF2, 0xFF), RGBColor(0x63, 0x66, 0xF1), "GeminiAPI")
    add_tb(slide, 4.70, 5.54, 1.40, 0.28, ["Gemini REST API"], size=9, bold=True, color=INK, align=PP_ALIGN.CENTER, name="Gemini_lbl")
    add_arrow_line(slide, "gemini_to_be", 5.41, 4.82, 5.41, 3.20)

    mail = add_oval(slide, 6.70, 4.82, 0.72, 0.72, RGBColor(0xCC, 0xFB, 0xF1), RGBColor(0x0D, 0x94, 0x88), "Nodemailer")
    add_tb(slide, 6.35, 5.54, 1.45, 0.28, ["Nodemailer (SMTP)"], size=9, bold=True, color=INK, align=PP_ALIGN.CENTER, name="SMTP_lbl")
    add_arrow_line(slide, "smtp_to_be", 7.06, 4.82, 7.06, 3.20)

    # Duck DNS: outside right, orthogonal elbow into Backend
    duck = add_oval(slide, 12.10, 0.18, 1.00, 0.95, RGBColor(0xDB, 0xEA, 0xFE), BLUE, "DuckDNS")
    add_tb(slide, 12.05, 0.02, 1.12, 0.20, ["Duck DNS"], size=10, bold=True, color=BLUE, align=PP_ALIGN.CENTER, name="DuckDNS_lbl")
    # ㄱ자: down then left into Backend right edge (8.30, 1.05)
    add_elbow(slide, "duck_to_backend", [(12.10, 0.65), (8.30, 0.65), (8.30, 1.05)])

    # Deploy bar
    bar = add_rr(slide, 0.22, 5.88, 12.90, 1.28, DEPLOY_BG, LAYER, "DeployBar")
    add_rr(slide, 0.38, 6.18, 1.35, 0.78, WHITE, LINE, "LocalDev")
    add_tb(slide, 0.40, 6.38, 1.30, 0.45, ["Local Dev"], size=12, bold=True, align=PP_ALIGN.CENTER, name="LocalDev_t")

    add_rr(slide, 2.00, 6.18, 1.20, 0.78, WHITE, LINE, "GitHub")
    add_tb(slide, 2.00, 6.38, 1.20, 0.45, ["GitHub"], size=12, bold=True, align=PP_ALIGN.CENTER, name="GitHub_t")

    add_rr(slide, 3.48, 6.18, 1.15, 0.78, WHITE, LINE, "Deploy")
    add_tb(slide, 3.48, 6.38, 1.15, 0.45, ["Deploy"], size=12, bold=True, align=PP_ALIGN.CENTER, name="Deploy_t")

    add_arrow_line(slide, "d1", 1.73, 6.57, 2.00, 6.57)
    add_arrow_line(slide, "d2", 3.20, 6.57, 3.48, 6.57)

    add_rr(slide, 4.90, 6.10, 1.85, 0.92, GREEN_BG, GREEN, "Pages")
    add_tb(slide, 4.92, 6.22, 1.82, 0.72, ["GitHub Pages", "Frontend"], size=11, bold=True, color=GREEN, align=PP_ALIGN.CENTER, name="Pages_t")

    add_rr(slide, 6.90, 6.10, 2.05, 0.92, BLUE_BG, BLUE, "LS_Backend")
    add_tb(slide, 6.92, 6.18, 2.02, 0.78, ["Lightsail Backend", "Nginx · Express :5000"], size=10, bold=True, color=BLUE, align=PP_ALIGN.CENTER, name="LS_Backend_t")

    add_rr(slide, 9.10, 6.10, 1.85, 0.92, PURPLE_BG, PURPLE, "LS_AI")
    add_tb(slide, 9.12, 6.22, 1.82, 0.72, ["Lightsail AI", "FastAPI :8000"], size=11, bold=True, color=PURPLE, align=PP_ALIGN.CENTER, name="LS_AI_t")

    add_rr(slide, 11.10, 6.10, 1.80, 0.92, MYSQL_BG, MYSQL, "LS_MySQL")
    add_tb(slide, 11.12, 6.22, 1.76, 0.72, ["Lightsail MySQL", "MySQL"], size=11, bold=True, color=RGBColor(0x0C, 0x4A, 0x6E), align=PP_ALIGN.CENTER, name="LS_MySQL_t")

    add_arrow_line(slide, "fork_pages", 4.63, 6.40, 4.90, 6.40)
    add_arrow_line(slide, "fork_be", 4.63, 6.72, 6.90, 6.72)

    add_tb(
        slide, 0.22, 7.18, 12.90, 0.28,
        ["Frontend는 GitHub Pages, Backend와 AI는 서로 다른 AWS Lightsail. Duck DNS는 Backend(Nginx)만 가리킴."],
        size=11, color=MUTED, align=PP_ALIGN.CENTER, name="footer",
    )

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
