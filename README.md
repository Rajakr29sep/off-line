# Kiwix Emergency — Offline-first starter

This repository is a development starter for a local emergency-information appliance.

## Architecture

- React/Vite frontend: category → situation/topic → ask a question → answer and citations.
- Express backend: stable `/api` endpoints and proxy to the local Python RAG service.
- FastAPI RAG service: SQLite FTS5 retrieval, category/topic filtering, optional local Ollama generation.
- ZIM files: put original `.zim` archives in `data/zims/`.
- `scripts/build-index.py`: uses the `zimdump` CLI from Kiwix-tools to extract article files and indexes HTML text into SQLite.
- Browser speech synthesis reads an answer aloud; voice is opt-in.

## Important safety limitations

This is a development scaffold, not a certified emergency response system. Its topic labels are navigation metadata, not medical or operational instructions. Do not rely on synthetic/demo facility coordinates. Verify emergency contact details and source rights before deployment. If retrieval is weak or no passages are found, the service should return a fallback rather than inventing instructions.

## 1. Prerequisites

Install Node.js LTS, Python 3.11+ and Kiwix-tools (`zimdump`, `kiwix-serve`). Put your own ZIM files into `data/zims/`.

`zimdump` options can differ between Kiwix-tools versions. Check `zimdump --help` if the extraction command needs adjustment. Extracting a large ZIM archive can require substantial disk space.

## 2. Install dependencies (PowerShell, project root)

```powershell
npm install
npm --prefix frontend install
npm --prefix backend install
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r rag-service\requirements.txt
```

## 3. Index ZIM files

```powershell
.\.venv\Scripts\python.exe scripts\build-index.py
```

The script runs `zimdump dump --dir=<output> <file.zim>` for each archive, extracts HTML article text, and creates `data/index/emergency.sqlite3`. Large archives may take a long time and need much more disk space than the ZIM itself. This first version is a transparent baseline, not a streaming ZIM parser.

## 4. Run all services

Open three terminals at the project root:

Terminal A — RAG service:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir rag-service --host 127.0.0.1 --port 8000 --reload
```

Terminal B — Express:
```powershell
npm --prefix backend run dev
```

Terminal C — frontend:
```powershell
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

You can also run `npm run dev` after installing root dependencies. Python must be available as `.venv` as configured above.

## 5. Kiwix article browsing

Run `kiwix-serve` locally with your selected ZIM files, for example:

```powershell
kiwix-serve --port=8080 data\zims\your-file.zim
```

Use `/kiwix/` through the Vite proxy for the browser UI. For multiple archives, pass each archive path to `kiwix-serve` according to the installed version's help output.

## 6. Retrieval and optional generation

The first implementation uses SQLite FTS5 to retrieve passages offline. If `OLLAMA_MODEL` is configured and Ollama is running locally with that model already downloaded, the service attempts local grounded generation. If generation is unavailable, it returns source excerpts rather than calling a cloud API.

For field deployment, download/install all required models and dependencies in advance, then test with internet disconnected. A local language model can still hallucinate; source verification and safety review are essential.
