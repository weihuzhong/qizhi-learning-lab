"""Verify native PPTX, then render matching SVGs with bounded local resources."""
import json
import re
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
from pptx import Presentation
from cairosvg.surface import PNGSurface
from cairosvg.url import safe_fetch


def render_svg(svg, preview, project, skill_dir=None):
    project = Path(project).resolve()

    def project_asset(url, resource_type):
        parsed = urlparse(url)
        if parsed.scheme == 'data':
            return safe_fetch(url, resource_type)
        if parsed.scheme not in ('', 'file'):
            raise ValueError('预览资源必须已保存在本任务内，不能临时访问外部地址')
        resource = Path(svg).resolve() if not parsed.path and parsed.fragment else Path(unquote(parsed.path)).resolve()
        resource.relative_to(project)
        if resource.stat().st_size > 8000000:
            raise ValueError('预览资源过大')
        return resource.read_bytes()

    content = Path(svg).read_text(encoding='utf-8')
    if re.search(r'<use\s+[^>]*data-icon=', content):
        skill = Path(skill_dir or os.environ.get('PPTMASTER_SKILL_DIR', '/opt/pptmaster/skills/ppt-master'))
        sys.path.insert(0, str(skill / 'scripts/svg_finalize'))
        # Same read-only icon expansion used by PPTMaster's own preview server.
        # The canonical authored SVG and its checker fingerprint stay untouched.
        from embed_icons import parse_use_element, resolve_icon_path, extract_paths_from_icon, generate_icon_group

        def inline_icon(match):
            attrs = parse_use_element(match.group(0))
            icon, _ = resolve_icon_path(attrs['icon'], project / 'icons')
            icon.resolve().relative_to(project)
            elements, style, base = extract_paths_from_icon(icon, str(attrs.get('fill', '#000000')), target_dir=Path(svg).parent)
            if not elements:
                raise ValueError('项目图标缺失：' + str(attrs['icon']))
            return generate_icon_group(attrs, elements, style, base)

        content = re.sub(r'<use\s+[^>]*data-icon="[^"]*"[^>]*/>', inline_icon, content)

    # CairoSVG's default safe fetcher deliberately ignores linked file images.
    # Give it an explicit project-only loader; keep entity expansion disabled.
    PNGSurface.convert(bytestring=content.encode(), url=str(Path(svg).resolve()), write_to=str(preview),
                       output_width=1280, output_height=720,
                       url_fetcher=project_asset, unsafe=False)


def verify_and_render(project, deck, expected, skill_dir=None):
    project, deck = Path(project).resolve(), Path(deck).resolve()
    presentation = Presentation(deck)
    pages = sorted((project / 'svg_output').glob('*.svg'))
    if len(presentation.slides) != expected or len(pages) != expected:
        raise ValueError(f'整稿数量不一致：PPTX {len(presentation.slides)}页、SVG {len(pages)}页、要求{expected}页')
    if max(p.stat().st_mtime_ns for p in pages) > deck.stat().st_mtime_ns:
        raise ValueError('SVG在PPTX导出后被修改，请重新检查并导出，确保预览与成稿一致')
    output = project / 'web_preview'
    output.mkdir(exist_ok=True)
    result = []

    def texts(shapes):
        result = []
        for shape in shapes:
            if getattr(shape, 'has_text_frame', False):
                result.append(shape.text)
            elif hasattr(shape, 'shapes'):
                result.extend(texts(shape.shapes))
        return result

    for index, (slide, svg) in enumerate(zip(presentation.slides, pages), 1):
        text = texts(slide.shapes)
        if not text and not slide._element.xpath('.//a:blip'):
            raise ValueError(f'第{index}页没有文本或图片，请检查实际导出')
        if not slide.has_notes_slide or not slide.notes_slide.notes_text_frame.text.strip():
            raise ValueError(f'第{index}页缺少教师指导备注')
        preview = output / f'page-{index:02}.png'
        render_svg(svg, preview, project, skill_dir)
        result.append({'title': next((x.strip().split('\n')[0][:80] for x in text if x.strip()), f'第{index}页'), 'preview': str(preview)})
    return {'count': len(presentation.slides), 'pages': result}


if __name__ == '__main__':
    print(json.dumps(verify_and_render(sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else None), ensure_ascii=False))
