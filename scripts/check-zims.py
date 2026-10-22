from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
folder = ROOT / "data" / "zims"
files = sorted(folder.glob("*.zim"))
print(f"ZIM directory: {folder}")
if not files:
    print("No .zim files found. Copy your archives into data/zims/.")
else:
    for f in files:
        print(f"{f.name} — {f.stat().st_size / (1024**3):.2f} GiB")
print("\nCheck Kiwix tools:")
import shutil, subprocess
for cmd in ("zimdump", "kiwix-serve"):
    path = shutil.which(cmd)
    print(f"{cmd}: {path or 'NOT FOUND (install Kiwix-tools and add it to PATH)'}")
    if path:
        try:
            out = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=10)
            print((out.stdout or out.stderr).strip()[:300])
        except Exception as exc:
            print(f"Could not query version: {exc}")
