import importlib.util
import tempfile
import unittest
from pathlib import Path
from PIL import Image

module_path = Path(__file__).resolve().parents[1] / 'pptmaster-service/verify-render.py'
spec = importlib.util.spec_from_file_location('ppt_render', module_path)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class RenderTests(unittest.TestCase):
    def test_relative_images_are_visible(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            (p / 'svg_output').mkdir()
            (p / 'images').mkdir()
            Image.new('RGB', (40, 40), '#ff0000').save(p / 'images/photo.png')
            svg = p / 'svg_output/01_cover.svg'
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="white"/><image href="../images/photo.png" x="0" y="0" width="640" height="720"/></svg>')
            renderer.render_svg(svg, p / 'preview.png', p)
            image = Image.open(p / 'preview.png').convert('RGB')
            self.assertEqual(image.getpixel((320, 360)), (255, 0, 0))

    def test_local_svg_fragment_is_visible(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            svg = p / '01.svg'
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><rect id="marker" width="100" height="100" fill="red"/></defs><use href="#marker" x="100" y="100"/></svg>')
            renderer.render_svg(svg, p / 'preview.png', p)
            self.assertEqual(Image.open(p / 'preview.png').convert('RGB').getpixel((150, 150)), (255, 0, 0))

    def test_images_cannot_read_outside_the_job(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            svg = p / '01.svg'
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><image href="file:///etc/passwd" width="1280" height="720"/></svg>')
            with self.assertRaises(Exception):
                renderer.render_svg(svg, p / 'preview.png', p)


if __name__ == '__main__':
    unittest.main()
