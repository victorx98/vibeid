#!/usr/bin/env python3
"""Build report.pdf from report.md using markdown + weasyprint."""

import os
import re
from pathlib import Path

import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

HERE = Path(__file__).parent
MD = HERE / "report.md"
PDF = HERE / "report.pdf"


def main() -> None:
    md_text = MD.read_text(encoding="utf-8")

    # Strip YAML frontmatter for content body and capture title.
    fm_match = re.match(r"^---\n(.*?)\n---\n", md_text, re.DOTALL)
    title = "Springboard 横纵分析报告"
    if fm_match:
        fm = fm_match.group(1)
        title_match = re.search(r'title:\s*"(.+?)"', fm)
        if title_match:
            title = title_match.group(1)
        md_text = md_text[fm_match.end():]

    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "sane_lists"],
    )

    full_html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{title}</title>
</head>
<body>
{html_body}
</body>
</html>
"""

    css = CSS(string=r"""
@page {
  size: A4;
  margin: 2cm 2cm 2.2cm 2cm;
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: "WenQuanYi Zen Hei", "Noto Serif CJK SC", serif;
    font-size: 9pt;
    color: #666;
  }
}

html, body {
  font-family: "WenQuanYi Zen Hei", "Noto Serif CJK SC", "Source Han Sans", serif;
  font-size: 10.5pt;
  line-height: 1.65;
  color: #1a1a1a;
}

h1 {
  font-size: 22pt;
  margin: 0.6em 0 0.4em 0;
  border-bottom: 3px solid #2c3e50;
  padding-bottom: 0.2em;
  page-break-after: avoid;
}

h2 {
  font-size: 16pt;
  margin: 1.2em 0 0.5em 0;
  color: #2c3e50;
  border-bottom: 1px solid #cdd5dd;
  padding-bottom: 0.15em;
  page-break-after: avoid;
}

h3 {
  font-size: 13pt;
  margin: 1em 0 0.4em 0;
  color: #34495e;
  page-break-after: avoid;
}

h4 {
  font-size: 11.5pt;
  margin: 0.8em 0 0.3em 0;
  color: #34495e;
  page-break-after: avoid;
}

p {
  margin: 0.4em 0 0.7em 0;
  text-align: justify;
}

ul, ol {
  margin: 0.3em 0 0.7em 0;
  padding-left: 1.4em;
}

li {
  margin: 0.15em 0;
}

blockquote {
  margin: 0.7em 0;
  padding: 0.4em 0.9em;
  background: #f4f6f8;
  border-left: 4px solid #2c3e50;
  color: #344;
  font-style: normal;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0 1em 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

th, td {
  border: 1px solid #c5cdd4;
  padding: 5px 7px;
  vertical-align: top;
  text-align: left;
}

th {
  background: #eef2f6;
  font-weight: 600;
}

tr:nth-child(even) td {
  background: #fafbfc;
}

code {
  font-family: "WenQuanYi Zen Hei Mono", "Courier New", monospace;
  font-size: 9.5pt;
  background: #f1f3f5;
  padding: 1px 3px;
  border-radius: 2px;
}

pre {
  background: #f6f8fa;
  padding: 0.7em;
  border-radius: 4px;
  font-size: 9.5pt;
  overflow-x: auto;
  page-break-inside: avoid;
}

a {
  color: #1e64bd;
  text-decoration: none;
  word-break: break-all;
}

hr {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 1.2em 0;
}

strong {
  color: #111;
}

/* Force section break before main chapters. */
h2 {
  page-break-before: auto;
}
""")

    font_config = FontConfiguration()
    HTML(string=full_html, base_url=str(HERE)).write_pdf(
        target=str(PDF),
        stylesheets=[css],
        font_config=font_config,
    )
    print(f"Wrote {PDF} ({PDF.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
