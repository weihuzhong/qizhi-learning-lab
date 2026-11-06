"""Repair measured module bounds without altering the authored SVG artwork."""
import json
import math
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET


def repair(file, quality, geometry, text_properties):
    source = file.read_text(encoding='utf-8')
    root = ET.fromstring(source)
    if root.tag != f'{{{quality.SVG_NS}}}svg' or root.get('viewBox', '').split() != ['0', '0', '1280', '720']:
        return False
    if any(root.get(attr) is not None for attr in ('data-pptx-master', 'data-pptx-layout')):
        return False

    checker = quality.SVGQualityChecker(quick_generate=True)
    parents = {id(child): parent for parent in root.iter() for child in parent}
    sizes = text_properties.resolve_project_font_sizes(root)
    spacings = text_properties.resolve_project_letter_spacings(root, sizes)
    bounds_attribute = 'data-pptx-bounds'
    canvas = (0, 0, 1280, 720)
    modules = []

    for group in root.findall(f'{{{quality.SVG_NS}}}g'):
        if group.get('data-pptx-authoring') or checker._is_hidden_element(group, parents):
            continue
        if group.get('data-pptx-morph-staging') or group.get('data-pptx-placeholder'):
            return False
        extents = []
        for element in group.iter():
            tag = quality._local_name(element)
            if tag in {'g', 'tspan', 'title', 'desc'}:
                continue
            if checker._has_non_visual_ancestor(element, root, parents) or checker._is_hidden_element(element, parents):
                continue
            if tag == 'text':
                if not ''.join(element.itertext()).strip():
                    continue
                box = checker._estimated_text_bounds(element, parents, sizes, spacings)
            elif tag in {'rect', 'image', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path'}:
                if tag == 'path' and re.search(r'[aA]', element.get('d', '')):
                    # The native geometry helper approximates arc extents.
                    return False
                local = geometry._element_local_bbox(element)
                box = None if local is None else checker._transformed_rect_bounds(
                    element, (local[0], local[1], local[2] - local[0], local[3] - local[1]), parents,
                )
            else:
                return False
            if box is None or not all(math.isfinite(value) for value in box):
                return False
            extents.append(box)
        if not extents:
            return False

        x1 = max(0, math.floor(min(box[0] for box in extents)) - 3)
        y1 = max(0, math.floor(min(box[1] for box in extents)) - 3)
        x2 = min(1280, math.ceil(max(box[2] for box in extents)) + 3)
        y2 = min(720, math.ceil(max(box[3] for box in extents)) + 3)
        if any(box[0] < 0 or box[1] < 0 or box[2] > 1280 or box[3] > 720 for box in extents):
            return False
        modules.append((group, (x1, y1, x2, y2)))

    # Actual overlaps require a layout edit. Metadata must describe real zones.
    ordinary = [box for group, box in modules
                if not checker._root_module_overlap_exempt(group, structured_page=False, canvas=canvas)]
    for i, box in enumerate(ordinary):
        if any(min(checker._bounds_overlap_dimensions(box, other)) > 1 for other in ordinary[i + 1:]):
            return False

    changed = False
    for group, (x1, y1, x2, y2) in modules:
        value = f'{x1} {y1} {x2 - x1} {y2 - y1}'
        if group.get(bounds_attribute) != value:
            group.set(bounds_attribute, value)
            changed = True
    if changed:
        ET.register_namespace('', quality.SVG_NS)
        ET.register_namespace('xlink', quality.XLINK_NS)
        file.write_text(ET.tostring(root, encoding='unicode'), encoding='utf-8')
    return changed


if __name__ == '__main__':
    sys.path.insert(0, str(Path(sys.argv[1]) / 'scripts'))
    from svg_quality import checker as quality
    from svg_to_pptx.drawingml import text_properties
    from svg_to_pptx.native_objects import marker_common as geometry

    changed_files = []
    for argument in sys.argv[2:]:
        file = Path(argument)
        try:
            if repair(file, quality, geometry, text_properties):
                changed_files.append(file.name)
        except (ValueError, TypeError, ET.ParseError):
            # The canonical checker will provide a diagnostic for the model.
            continue
    print(json.dumps(changed_files))
