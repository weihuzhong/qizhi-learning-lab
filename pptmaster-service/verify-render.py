"""Validate the actual native PPTX and render its matching authored SVG roster."""
import json
import sys
from pathlib import Path
from pptx import Presentation
import cairosvg

project, deck = (Path(p).resolve() for p in sys.argv[1:3])
expected = int(sys.argv[3])
presentation = Presentation(deck)
pages = sorted((project / 'svg_output').glob('*.svg'))
if len(presentation.slides) != expected or len(pages) != expected:
    raise ValueError(f'整稿数量不一致：PPTX {len(presentation.slides)}页、SVG {len(pages)}页、要求{expected}页')
output = project / 'web_preview'
output.mkdir(exist_ok=True)
result = []
for index, (slide, svg) in enumerate(zip(presentation.slides, pages), 1):
    def texts(shapes):
        result = []
        for shape in shapes:
            if getattr(shape, 'has_text_frame', False):
                result.append(shape.text)
            elif hasattr(shape, 'shapes'):
                result.extend(texts(shape.shapes))
        return result
    text = texts(slide.shapes)
    if not text and not any(shape.shape_type == 13 for shape in slide.shapes):
        raise ValueError(f'第{index}页没有文本或图片，请检查实际导出')
    if not slide.has_notes_slide or not slide.notes_slide.notes_text_frame.text.strip():
        raise ValueError(f'第{index}页缺少教师指导备注')
    preview = output / f'page-{index:02}.png'
    cairosvg.svg2png(url=str(svg), write_to=str(preview), output_width=1280, output_height=720)
    result.append({'title': next((x.strip().split('\n')[0][:80] for x in text if x.strip()), f'第{index}页'), 'preview': str(preview)})
print(json.dumps({'count': len(presentation.slides), 'pages': result}, ensure_ascii=False))
