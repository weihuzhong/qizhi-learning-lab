"""Normalize and verify editable PowerPoint output, then render the actual deck."""
from collections import Counter
import json
import re
import os
import subprocess
import sys
from tempfile import TemporaryDirectory
import unicodedata
from pathlib import Path
from urllib.parse import urlparse, unquote
from zipfile import ZipFile

import fitz
from lxml import etree
from pptx import Presentation
from cairosvg.surface import PNGSurface
from cairosvg.url import safe_fetch


DML = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
PML = '{http://schemas.openxmlformats.org/presentationml/2006/main}'


def normalize_text_boxes(deck):
    """Use the actual CJK font and preserve explicit line breaks in native text boxes."""
    deck = Path(deck)
    with TemporaryDirectory(dir=deck.parent) as scratch:
        output = Path(scratch) / deck.name
        with ZipFile(deck) as source, ZipFile(output, 'w') as target:
            for member in source.infolist():
                data = source.read(member)
                if re.fullmatch(r'ppt/slides/slide\d+\.xml', member.filename):
                    slide = etree.fromstring(data)
                    for body in slide.iter(PML + 'txBody'):
                        for element in body.iter():
                            if (element.tag in {DML + 'latin', DML + 'ea', DML + 'cs'}
                                    and element.get('typeface') in {'微软雅黑', 'Microsoft YaHei', 'Noto Sans CJK SC'}):
                                element.set('typeface', 'Noto Sans CJK SC')
                                element.attrib.pop('panose', None)
                                element.attrib.pop('charset', None)
                        props = body.find(DML + 'bodyPr')
                        if props is not None and props.get('wrap') == 'none':
                            auto_fit = props.find(DML + 'spAutoFit')
                            if auto_fit is not None:
                                auto_fit.tag = DML + 'noAutofit'
                    data = etree.tostring(slide, encoding='UTF-8', xml_declaration=True, standalone=True)
                target.writestr(member, data)
        output.replace(deck)


def visible_characters(text):
    return Counter(c for c in unicodedata.normalize('NFKC', text) if c.isalnum())


def rendered_text_issues(page, text, slide):
    missing = visible_characters('\n'.join(text)) - visible_characters(page.get_text())
    issues = []
    if sum(missing.values()) >= 2:
        issues.append({'slide': slide, 'reason': '放映检查发现部分文字缺失或被裁切。',
                       'correction': '请对照教案检查本页文字，扩大文字框或按语义分行。'})
    blocks = page.get_text('dict', flags=fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES)['blocks']
    spans = [span for block in blocks for line in block.get('lines', []) for span in line['spans']]
    small_characters = sum(
        sum(visible_characters(span['text']).values())
        for span in spans if span['size'] < page.rect.width * 21 / 1280
    )
    if small_characters > 30:
        issues.append({'slide': slide, 'reason': '本页有较多小字，课堂投影可能难以辨认。',
                       'correction': '把实施细节移入教师备注，放大保留在页面上的学生用语。'})
    return issues


def render_powerpoint(deck, result, output):
    with TemporaryDirectory(dir=deck.parent) as scratch:
        directory = Path(scratch)
        subprocess.run(
            ['soffice', '-env:UserInstallation=' + (directory / 'profile').as_uri(),
             '--headless', '--convert-to', 'pdf:impress_pdf_Export',
             '--outdir', str(directory), str(deck)],
            check=True, capture_output=True, timeout=55,
        )
        with fitz.open(directory / (deck.stem + '.pdf')) as pdf:
            if len(pdf) != len(result):
                raise ValueError('放映页数与 PPTX 不一致')
            issues = []
            for index, (page, info) in enumerate(zip(pdf, result), 1):
                issues.extend(rendered_text_issues(page, info['nativeText'], index))
                scale = 1280 / page.rect.width
                page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False).save(output / f'page-{index:02}.png')
            return issues


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


def verify_and_render(project, deck, expected, skill_dir=None, *, render=True):
    project, deck = Path(project).resolve(), Path(deck).resolve()
    presentation = Presentation(deck)
    pages = sorted((project / 'svg_output').glob('*.svg'))
    if len(presentation.slides) != expected or len(pages) != expected:
        raise ValueError(f'整稿数量不一致：PPTX {len(presentation.slides)}页、SVG {len(pages)}页、要求{expected}页')
    if max(p.stat().st_mtime_ns for p in pages) > deck.stat().st_mtime_ns:
        raise ValueError('SVG在PPTX导出后被修改，请重新检查并导出，确保预览与成稿一致')
    output = project / 'web_preview'
    if render:
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
        result.append({'text': '\n'.join(text)[:8000], 'nativeText': text,
                       'title': next((x.strip().split('\n')[0][:80] for x in text if x.strip()), f'第{index}页'),
                       'preview': str(preview)})
    issues = []
    preview_source = None
    if render:
        try:
            issues = render_powerpoint(deck, result, output)
            preview_source = 'pptx'
        except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
            print(f'Native preview unavailable: {type(error).__name__}', file=sys.stderr)
            for svg, info in zip(pages, result):
                render_svg(svg, info['preview'], project, skill_dir)
            preview_source = 'design'
    for info in result:
        del info['nativeText']
    return {'count': len(presentation.slides), 'pages': result,
            'previewSource': preview_source, 'visualIssues': issues}


if __name__ == '__main__':
    if sys.argv[1] == '--normalize-text':
        normalize_text_boxes(sys.argv[2])
    else:
        args = [arg for arg in sys.argv[1:] if arg != '--text-only']
        print(json.dumps(verify_and_render(
            args[0], args[1], int(args[2]), args[3] if len(args) > 3 else None,
            render='--text-only' not in sys.argv,
        ), ensure_ascii=False))
