from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
source = root / "screenshots"
target = Path(__file__).resolve().parent / ".video-frames"
target.mkdir(exist_ok=True)
captions = [
    ("01-inbox.png", "Graphline / ANTIINTERNS / Synthetic FalkorDB demo"),
    ("02-graph-routed-delivery.png", "Message keywords follow graph links to intent policy and team"),
    ("03-human-ticket-created.png", "Returns policy triggers a ticket assigned to the Returns team"),
    ("04-cross-conversation-memory.png", "A new thread retrieves the same customers graph linked history"),
]
font_path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
if not font_path.exists():
    font_path = Path("/Library/Fonts/Arial.ttf")
font = ImageFont.truetype(str(font_path), 23) if font_path.exists() else ImageFont.load_default()

for index, (filename, caption) in enumerate(captions, 1):
    image = Image.open(source / filename).convert("RGB")
    frame_height = image.height + 70 + ((image.height + 70) % 2)
    frame = Image.new("RGB", (image.width, frame_height), "#101827")
    frame.paste(image, (0, 0))
    draw = ImageDraw.Draw(frame)
    draw.text((48, image.height + 22), caption, fill="#ffffff", font=font)
    frame.save(target / f"{index:02}.png", optimize=True)
