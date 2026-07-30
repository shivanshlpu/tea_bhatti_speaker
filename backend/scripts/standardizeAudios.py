import os
import re
import shutil

src_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'audios'))
dest_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'audio_clips'))

os.makedirs(dest_dir, exist_ok=True)

files = os.listdir(src_dir)
print(f"Total audio files found in audios/: {len(files)}")

mapped = {} # key: (item_id, lang) -> src_file

for fname in sorted(files):
    if not fname.endswith('.mp3'):
        continue

    # Regex to extract item number and language tag
    # Handles: item_10_bhop, item_10_en (2), item_11_bhojpuri, item_19_bhojpri, tem_31_bho
    m = re.search(r'(?:item|tem)_?(\d+)[_\s]*([a-zA-Z]+)', fname, re.IGNORECASE)
    if not m:
        print(f"⚠️ Could not parse: {fname}")
        continue

    item_id = int(m.group(1))
    raw_lang = m.group(2).lower()

    if raw_lang in ['en', 'english']:
        lang = 'en'
    elif raw_lang in ['hi', 'hin', 'hindi']:
        lang = 'hi'
    elif raw_lang in ['bho', 'bhop', 'bhojpuri', 'bhojpri']:
        lang = 'bho'
    else:
        print(f"⚠️ Unknown language tag '{raw_lang}' in file: {fname}")
        continue

    # Prefer clean file if duplicates like (2) exist
    key = (item_id, lang)
    if key not in mapped or '(2)' not in fname:
        mapped[key] = fname

print(f"\nSuccessfully mapped {len(mapped)} unique (item_id, lang) pairs.")

copied_count = 0
for (item_id, lang), fname in sorted(mapped.items()):
    src_path = os.path.join(src_dir, fname)
    target_name = f"item_{item_id}_{lang}.mp3"
    dest_path = os.path.join(dest_dir, target_name)
    shutil.copy2(src_path, dest_path)
    copied_count += 1
    print(f"  [OK] {fname} -> {target_name}")

print(f"\nCopied and standardized {copied_count} audio clips into {dest_dir}")

# Check missing items
missing = []
for i in range(1, 40):
    for l in ['en', 'hi', 'bho']:
        if (i, l) not in mapped:
            missing.append(f"item_{i}_{l}.mp3")

if missing:
    print(f"\nMissing {len(missing)} audio clips:")
    for m in missing:
        print(f"  - {m}")
else:
    print("\nALL 117 AUDIO CLIPS PRESENT AND PERFECTLY MAPPED (100% COVERAGE)!")
