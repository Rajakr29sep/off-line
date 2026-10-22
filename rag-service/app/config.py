from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("KIWIX_DATA_DIR", ROOT / "data")).resolve()
ZIM_DIR = DATA_DIR / "zims"
EXTRACTED_DIR = DATA_DIR / "extracted"
INDEX_DIR = DATA_DIR / "index"
DB_PATH = Path(os.getenv("KIWIX_DB_PATH", INDEX_DIR / "emergency.sqlite3")).resolve()

# Ollama settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "").strip()

# llama.cpp settings
LLAMA_CPP_BASE_URL = os.getenv("LLAMA_CPP_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
LOCAL_MODEL_PATH = Path(os.getenv("LOCAL_MODEL_PATH", ROOT / "models" / "qwen2.5-1.5b-instruct-q4_k_m.gguf")).resolve()
