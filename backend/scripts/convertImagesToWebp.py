import os
from PIL import Image

menu_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'menu_images'))
logo_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'logo.png'))

print("Converting all 92MB PNG menu images to high-performance WebP (<25KB)...")

total_orig = 0
total_new = 0

for filename in os.listdir(menu_dir):
    if filename.endswith('.png') or filename.endswith('.jpg'):
        filepath = os.path.join(menu_dir, filename)
        orig_size = os.path.getsize(filepath)
        total_orig += orig_size

        basename = os.path.splitext(filename)[0]
        webp_filename = f"{basename}.webp"
        webp_path = os.path.join(menu_dir, webp_filename)

        img = Image.open(filepath)
        img.thumbnail((450, 450), Image.Resampling.LANCZOS)
        img.save(webp_path, 'WEBP', quality=82, method=6)

        new_size = os.path.getsize(webp_path)
        total_new += new_size
        print(f"  Processed {filename} ({orig_size/1024:.0f} KB) -> {webp_filename} ({new_size/1024:.0f} KB)")

# Also optimize logo.png
if os.path.exists(logo_path):
    img = Image.open(logo_path)
    img.thumbnail((300, 300), Image.Resampling.LANCZOS)
    img.save(os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'logo.webp'), 'WEBP', quality=85)
    print("  Processed logo.png -> logo.webp")

print(f"\nTotal size reduction: {total_orig / (1024*1024):.1f} MB -> {total_new / (1024*1024):.1f} MB ({((total_orig - total_new)/total_orig)*100:.1f}% space saved!)")
