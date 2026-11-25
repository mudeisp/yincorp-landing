"""Render styles over a fixed raster reference, without inferred CAD geometry."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def render(source, style):
    source = source.convert("RGB")
    gray = ImageOps.grayscale(source)
    palettes = {
        "blueprint": ("#473727", "#fbf4e5"),
        "xray": ("#26374a", "#f5e6cb"),
        "facade": ("#503b2b", "#faf0dc"),
    }
    if style in palettes:
        return ImageOps.colorize(gray, *palettes[style])
    if style == "editorial":
        return Image.blend(source, ImageOps.colorize(gray, "#34291f", "#fff6e7"), 0.26)
    if style == "maquette":
        relief = gray.filter(ImageFilter.EMBOSS)
        # Blend surface detail without translating any source pixel.
        return Image.blend(source, ImageOps.colorize(relief, "#514235", "#fff0d8"), 0.16)
    raise ValueError(style)


def exploded(levels):
    # Translational separation of complete book layers. No reconstructed height or volume.
    width = max(image.width for image in levels)
    gap = 48
    canvas = Image.new("RGB", (width + 2 * gap, sum(image.height for image in levels) + gap * (len(levels) + 1)), "#faf7f1")
    y = gap
    for image in levels:
        canvas.paste(image, ((canvas.width - image.width) // 2, y))
        y += image.height + gap
    return canvas


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("directory", type=Path)
    args = cli.parse_args()
    folder = args.directory
    manifest_path = folder / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    pending = {a["key"]: a for a in manifest["assets"] if a["status"] in {"review", "rejected"}}
    for key in ("fachada", "implantacao", "maquette", "blueprint", "editorial", "xray"):
        if key not in pending or any(a.get("previous") == key and a.get("recipeVersion") == "1.1.0" for a in manifest["assets"]):
            continue
        asset = pending[key]
        paths = [folder / Path(source).name for source in asset.get("originals", [asset["original"]])]
        sources = [Image.open(path).convert("RGB") for path in paths]
        if key == "implantacao":
            image = exploded(sources)
            caption = "Implantação · térreo e primeiro pavimento"
            review = "Níveis do book separados por translação. Mantém os desenhos de origem; sem alturas inferidas."
        else:
            image = render(sources[0], asset["category"])
            assert image.size == sources[0].size
            caption = asset["caption"]
            review = "Mesma malha de pixels da fonte, com tratamento tonal. Nenhuma parede ou abertura redesenhada."
        if key == "fachada":
            caption = "Vista parcial da praça e das torres"
            review += " A imagem parcial é exibida na galeria, sem uso como capa."
        name = f"{key}-v11.webp"
        image.save(folder / name, quality=86, method=6)
        updated = {k: v for k, v in asset.items() if k not in {"prompt", "styleReference", "promptVersion"}}
        updated.update(key=key + "-v11", previous=key, asset=f"/visual-engine/17933/{name}",
                       caption=caption, review=review, status="approved", method="geometry",
                       recipeVersion="1.1.0", coverEligible=False)
        manifest["assets"].append(updated)
    manifest["version"] = "1.1.0"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
