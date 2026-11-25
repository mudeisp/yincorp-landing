"""Transfer a generated reference's atmosphere onto the unmoved original pixels."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageStat


def transfer(original, generated):
    source = original.convert("RGB")
    target = generated.convert("RGB")
    # Apply bounded monotonic curves per channel. Never copy generated spatial detail.
    averages = ImageStat.Stat(source).mean
    target_averages = ImageStat.Stat(target).mean
    offsets = [max(-15, min(15, (b - a) * 0.65)) for a, b in zip(averages, target_averages)]
    curve = [max(0, min(255, round(i + offset * 4 * i * (255 - i) / 255**2)))
             for offset in offsets for i in range(256)]
    assert all(curve[i] <= curve[i + 1] for i in range(767) if i % 256 != 255)
    return source.point(curve), offsets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("candidates", type=Path)
    args = parser.parse_args()
    manifest_path = args.directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for key, candidate in json.loads(args.candidates.read_text()).items():
        old = next(a for a in manifest["assets"] if a["key"] == key)
        if old["status"] not in {"review", "rejected"} or any(
            a.get("previous") == key and a.get("recipeVersion") == "1.1.0" for a in manifest["assets"]
        ):
            continue
        new_name = key + "-v11.webp"
        src = args.directory / Path(old["original"]).name
        generated = Path(candidate["path"])
        with Image.open(src) as original, Image.open(generated) as target:
            image, offsets = transfer(original, target)
            assert image.size == original.size
            image.save(args.directory / new_name, quality=90, method=6)
        manifest["assets"].append({
            "key": key + "-v11", "previous": key, "page": old["page"],
            "category": old["category"], "caption": old["caption"],
            "original": old["original"], "asset": f"/visual-engine/17933/{new_name}",
            "status": "approved", "method": "generated-atmosphere-source-locked",
            "recipeVersion": "1.1.0", "promptVersion": "1.1.0", "prompt": candidate["prompt"],
            "generatedReferenceSha256": hashlib.sha256(generated.read_bytes()).hexdigest(),
            "channelOffsets": [round(value, 4) for value in offsets],
            "review": "Atmosfera derivada da edição generativa. Curvas tonais aplicadas à imagem original, mantendo enquadramento, objetos e arquitetura na mesma posição."
        })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
