from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data_contract" / "public_result.json"
OUTPUT_PATH = ROOT / "output" / "pdf" / "beidou_formal_diagnostic_report.pdf"
FONT_PATH = Path(r"C:\Windows\Fonts\simhei.ttf")

GREEN_DARK = colors.HexColor("#083727")
GREEN = colors.HexColor("#1f8b59")
GREEN_SOFT = colors.HexColor("#e7f4ea")
INK = colors.HexColor("#17392f")
MUTED = colors.HexColor("#63786f")
LINE = colors.HexColor("#d8e3db")
PAPER = colors.HexColor("#f4f7f3")
ORANGE = colors.HexColor("#d97838")


def pct(value: float, digits: int = 2) -> str:
    return f"{value * 100:.{digits}f}%"


def pp(value: float) -> str:
    return f"{value * 100:.2f}个百分点"


def validate_payload(payload: dict) -> None:
    if payload.get("evidence_status") != "prediction_backed":
        raise ValueError("正式报告只接受 prediction_backed 结果")
    if payload["budget"]["total"] != payload["budget"]["allocated_sum"]:
        raise ValueError("回放预算不守恒")
    if not payload.get("quality", {}).get("recommended_for_bp"):
        raise ValueError("当前结果未通过竞赛候选门槛")


def register_font() -> str:
    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Chinese font not found: {FONT_PATH}")
    pdfmetrics.registerFont(TTFont("SimHei", str(FONT_PATH)))
    return "SimHei"


class ReportDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, font_name: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title="北斗无人机巡检时空局部风险正式诊断报告",
            author="北斗巡知项目组",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates(PageTemplate(id="report", frames=[frame], onPage=self._draw_page))
        self.font_name = font_name

    def _draw_page(self, canvas, doc):
        canvas.saveState()
        if doc.page == 1:
            canvas.setFillColor(GREEN_DARK)
            canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        else:
            canvas.setStrokeColor(LINE)
            canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
            canvas.setFont(self.font_name, 7)
            canvas.setFillColor(MUTED)
            canvas.drawString(16 * mm, 7.5 * mm, "北斗巡知 · 正式诊断报告")
            canvas.drawRightString(A4[0] - 16 * mm, 7.5 * mm, f"第 {doc.page} 页")
        canvas.restoreState()


def build_styles(font_name: str):
    base = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle("cover_brand", parent=base["Normal"], fontName=font_name, fontSize=13, textColor=colors.HexColor("#a8d5b7"), leading=18),
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName=font_name, fontSize=9, textColor=colors.HexColor("#83c99c"), leading=14, spaceAfter=8),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName=font_name, fontSize=31, leading=42, textColor=colors.white, alignment=TA_LEFT, spaceAfter=18),
        "cover_lead": ParagraphStyle("cover_lead", parent=base["Normal"], fontName=font_name, fontSize=11, leading=20, textColor=colors.HexColor("#c7dbd0")),
        "cover_meta": ParagraphStyle("cover_meta", parent=base["Normal"], fontName=font_name, fontSize=8.5, leading=15, textColor=colors.HexColor("#d7e7df")),
        "kicker": ParagraphStyle("kicker", parent=base["Normal"], fontName=font_name, fontSize=7.5, textColor=GREEN, leading=11, spaceAfter=3),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=font_name, fontSize=21, leading=28, textColor=INK, spaceAfter=12),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=font_name, fontSize=13, leading=19, textColor=INK, spaceBefore=12, spaceAfter=7),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName=font_name, fontSize=9, leading=16, textColor=colors.HexColor("#425e54"), spaceAfter=7),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName=font_name, fontSize=7.2, leading=12, textColor=MUTED),
        "metric_label": ParagraphStyle("metric_label", parent=base["Normal"], fontName=font_name, fontSize=7.5, textColor=MUTED, leading=11),
        "metric_value": ParagraphStyle("metric_value", parent=base["Normal"], fontName=font_name, fontSize=19, textColor=INK, leading=24),
        "table": ParagraphStyle("table", parent=base["Normal"], fontName=font_name, fontSize=6.8, leading=9, textColor=INK),
        "table_header": ParagraphStyle("table_header", parent=base["Normal"], fontName=font_name, fontSize=6.8, leading=9, textColor=colors.white),
        "table_small": ParagraphStyle("table_small", parent=base["Normal"], fontName=font_name, fontSize=5.7, leading=7.4, textColor=INK),
        "table_small_header": ParagraphStyle("table_small_header", parent=base["Normal"], fontName=font_name, fontSize=5.7, leading=7.4, textColor=colors.white),
        "center_small": ParagraphStyle("center_small", parent=base["Normal"], fontName=font_name, fontSize=7, leading=10, alignment=TA_CENTER, textColor=INK),
    }


def P(text: str, style) -> Paragraph:
    return Paragraph(text, style)


def metric_table(items: list[tuple[str, str, str]], styles) -> Table:
    cells = []
    for label, value, note in items:
        cells.append([P(label, styles["metric_label"]), Spacer(1, 2), P(value, styles["metric_value"]), P(note, styles["small"])])
    table = Table([cells], colWidths=[(A4[0] - 32 * mm - 12) / len(cells)] * len(cells), hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#a8cdb5")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def build_story(payload: dict, styles) -> list:
    primary = next(item for item in payload["methods"] if item["name"] == payload["primary_method"])
    comparator = next(item for item in payload["methods"] if item["name"] != payload["primary_method"])
    accuracy_delta = primary["average_accuracy"] - comparator["average_accuracy"]
    forgetting_delta = comparator["average_forgetting"] - primary["average_forgetting"]
    locations = sorted(payload["locations"], key=lambda item: item["risk"], reverse=True)
    top_three = locations[:3]
    highest_forgetting = max(locations, key=lambda item: item["forgetting"])
    lowest_accuracy = min(locations, key=lambda item: item["accuracy"])
    top_budget = sum(item["replay_budget"] for item in top_three)

    story = [
        Spacer(1, 12 * mm),
        P("北斗巡知 · BEIDOU INSIGHT", styles["cover_brand"]),
        Spacer(1, 31 * mm),
        P("北斗时空信息 × 低空巡检 × 类别增量持续学习", styles["cover_kicker"]),
        P("无人机巡检时空局部风险<br/>正式诊断报告", styles["cover_title"]),
        P("基于公开航拍数据预测结果与虚拟北斗时空索引，评估类别增量学习方法的识别稳定性、区域遗忘风险和有限回放预算分配。", styles["cover_lead"]),
        Spacer(1, 45 * mm),
        HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#547767")),
        Spacer(1, 6 * mm),
        P(f"报告编号：{payload['release_id']}<br/>证据状态：模型预测支撑（prediction_backed）<br/>结果质量：竞赛候选结果（competition_candidate）<br/>数据契约版本：{payload['contract_version']}", styles["cover_meta"]),
        PageBreak(),
        P("01 · EXECUTIVE DIAGNOSIS", styles["kicker"]),
        P("诊断结论", styles["h1"]),
        metric_table([
            ("主方法最终识别率", pct(primary["average_accuracy"]), f"较基线提升 {pp(accuracy_delta)}"),
            ("主方法平均遗忘率", pct(primary["average_forgetting"]), f"较基线降低 {pp(forgetting_delta)}"),
            ("首要风险区域", top_three[0]["name"], f"风险 {round(top_three[0]['risk'] * 100)} · {top_three[0]['recommended_action']}"),
        ], styles),
        Spacer(1, 7 * mm),
        P("自动诊断摘要", styles["h2"]),
        P(
            f"{payload['primary_method']}在 {payload['dataset']['prediction_count']} 条公开预测上取得 {pct(primary['average_accuracy'])} 的最终识别率，"
            f"较 {comparator['name']} 提升 {pp(accuracy_delta)}；平均遗忘率由 {pct(comparator['average_forgetting'])} 降至 {pct(primary['average_forgetting'])}。"
            f"区域诊断显示，{highest_forgetting['name']} 的遗忘率最高（{pct(highest_forgetting['forgetting'])}），"
            f"{lowest_accuracy['name']} 的当前识别率最低（{pct(lowest_accuracy['accuracy'])}）。"
            f"建议优先对 {'、'.join(item['name'] for item in top_three)} 执行补采、复飞与增量更新。",
            styles["body"],
        ),
        P("02 · DATA AND PROTOCOL", styles["kicker"]),
        P("数据与验证协议", styles["h1"]),
    ]

    protocol = [
        [P("数据集与场景", styles["table"]), P(payload["dataset"]["name"], styles["table"])],
        [P("公开预测数量", styles["table"]), P(f"{payload['dataset']['prediction_count']} 条；元数据 {payload['dataset']['metadata_count']} 条", styles["table"])],
        [P("类别增量设置", styles["table"]), P(f"{payload['dataset']['class_count']} 类 / {payload['dataset']['task_count']} 个顺序任务", styles["table"])],
        [P("固定回放预算", styles["table"]), P(f"总量 {payload['budget']['total']}；区域分配合计 {payload['budget']['allocated_sum']}；预算守恒", styles["table"])],
    ]
    protocol_table = Table(protocol, colWidths=[38 * mm, 139 * mm])
    protocol_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PAPER), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([
        protocol_table,
        Spacer(1, 4 * mm),
        P("模型指标来自正式公开结果文件；区域名称、北斗坐标、定位误差与航线属于仿真时空标签，用于验证局部诊断和任务调度流程。", styles["small"]),
        PageBreak(),
        P("03 · METHOD COMPARISON", styles["kicker"]),
        P("方法对比", styles["h1"]),
    ])

    method_rows = [[P(text, styles["table_header"]) for text in ["方法", "最终识别率", "宏平均识别率", "平均遗忘率", "结论"]]]
    for method in payload["methods"]:
        method_rows.append([
            P(method["name"], styles["table"]), P(pct(method["average_accuracy"]), styles["center_small"]),
            P(pct(method["macro_accuracy"]), styles["center_small"]), P(pct(method["average_forgetting"]), styles["center_small"]),
            P("主方法" if method["name"] == payload["primary_method"] else "对比基线", styles["center_small"]),
        ])
    method_table = Table(method_rows, colWidths=[52 * mm, 31 * mm, 31 * mm, 31 * mm, 28 * mm], repeatRows=1)
    method_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 2), (-1, 2), GREEN_SOFT), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([
        method_table,
        Spacer(1, 7 * mm),
        P(f"主方法最终识别率提升 {pp(accuracy_delta)}，平均遗忘率降低 {pp(forgetting_delta)}。两项指标方向一致，支持“在固定回放预算下改善持续学习稳定性”的竞赛表述。", styles["body"]),
        P("04 · LOCATION-SPECIFIC DIAGNOSTICS", styles["kicker"]),
        P("分区域时空诊断", styles["h1"]),
    ])

    location_rows = [[P(text, styles["table_small_header"]) for text in ["区域", "样本", "识别率", "历史峰值", "遗忘率", "定位误差", "风险", "预算", "处置建议"]]]
    for location in locations:
        location_rows.append([
            P(f"{location['name']}<br/>{location['location_id']}", styles["table_small"]),
            P(str(location["sample_count"]), styles["table_small"]), P(pct(location["accuracy"]), styles["table_small"]),
            P(pct(location["previous_accuracy"]), styles["table_small"]), P(pct(location["forgetting"]), styles["table_small"]),
            P(f"{location['position_error_mean_m']:.2f} m", styles["table_small"]), P(str(round(location["risk"] * 100)), styles["table_small"]),
            P(str(location["replay_budget"]), styles["table_small"]), P(location["recommended_action"], styles["table_small"]),
        ])
    location_table = Table(location_rows, colWidths=[24 * mm, 13 * mm, 19 * mm, 19 * mm, 18 * mm, 20 * mm, 12 * mm, 12 * mm, 36 * mm], repeatRows=1)
    location_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 1), (-1, 3), colors.HexColor("#fff6ed")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.extend([
        location_table,
        Spacer(1, 5 * mm),
        P(f"前三风险区域：{'、'.join(item['name'] for item in top_three)}；获得回放预算 {top_budget}/{payload['budget']['total']}，占 {pct(top_budget / payload['budget']['total'], 1)}。", styles["body"]),
        PageBreak(),
        P("05 · DECISION RECOMMENDATIONS", styles["kicker"]),
        P("巡检决策建议", styles["h1"]),
    ])
    recommendations = [
        f"<b>优先补采：</b>将 {'、'.join(item['name'] for item in top_three)} 列入重点复飞队列，补充低视角、逆光和遮挡条件下的有效样本。",
        f"<b>持续更新：</b>保持总预算 {payload['budget']['total']} 不变，优先保留高风险区域的历史语义证据，避免均匀回放掩盖局部失效。",
        f"<b>人工复核：</b>对 {highest_forgetting['name']} 的高遗忘目标建立人工确认闭环，新类别确认后再进入增量训练任务。",
        "<b>部署前验证：</b>在真实北斗终端、真实航线和机载算力条件下复核定位误差、推理时延与存储占用，当前结果不得直接外推为现场性能。",
    ]
    for index, recommendation in enumerate(recommendations, 1):
        story.append(KeepTogether([P(f"{index}. {recommendation}", styles["body"]), Spacer(1, 2 * mm)]))

    story.extend([
        Spacer(1, 6 * mm),
        Table([[P("证据边界与使用说明", styles["h2"])], [P(payload["disclosure"], styles["body"])], [P("仿真交互页的参数调整与导出文件始终标记为 simulation_only；本报告不代表真实外业飞行、机载部署、真实北斗终端精度或商业客户验收结果。", styles["small"])]], colWidths=[177 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN_SOFT), ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#9bc9aa")),
            ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])),
    ])
    return story


def main() -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    validate_payload(payload)
    font_name = register_font()
    styles = build_styles(font_name)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = ReportDocTemplate(str(OUTPUT_PATH), font_name)
    doc.build(build_story(payload, styles))
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
