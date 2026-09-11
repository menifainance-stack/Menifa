#!/usr/bin/env python3
"""
מניפה סטודיו — אפליקציית ווב: מעלים סרטון ארוך, מקבלים רילס.
    uvicorn app:app --host 0.0.0.0 --port 8765
משתני סביבה: STUDIO_PASSWORD (חובה בפרודקשן), STUDIO_DATA (ברירת מחדל ./data), MAX_UPLOAD_MB (4000),
              STT_BACKEND/GROQ_API_KEY/ELEVENLABS_API_KEY, ANTHROPIC_API_KEY, FONTS_DIR, CAPTION_FONT
"""
from __future__ import annotations

import json
import os
import queue
import secrets
import shutil
import threading
import time
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import pipeline

DATA = Path(os.environ.get("STUDIO_DATA", "data")).resolve()
JOBS = DATA / "jobs"; JOBS.mkdir(parents=True, exist_ok=True)
PASSWORD = os.environ.get("STUDIO_PASSWORD", "")
MAX_UPLOAD = int(os.environ.get("MAX_UPLOAD_MB", "4000")) * 1024 * 1024
ALLOWED = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mp3", ".m4a", ".wav"}

app = FastAPI(title="מניפה סטודיו", docs_url=None, redoc_url=None)
app.mount("/media", StaticFiles(directory=str(JOBS)), name="media")
_q: "queue.Queue[str]" = queue.Queue()
_lock = threading.Lock()


def _job_path(jid: str) -> Path:
    if not all(c in "0123456789abcdef-" for c in jid) or len(jid) != 36:
        raise HTTPException(400, "bad id")
    return JOBS / jid


def _read(jid: str) -> dict:
    p = _job_path(jid) / "job.json"
    if not p.exists():
        raise HTTPException(404, "לא נמצא")
    return json.loads(p.read_text(encoding="utf-8"))


def _write(jid: str, data: dict) -> None:
    with _lock:
        (_job_path(jid) / "job.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def auth(request: Request) -> None:
    if not PASSWORD:
        return
    token = request.headers.get("X-Studio-Key") or request.cookies.get("studio_key") or request.query_params.get("key")
    if not token or not secrets.compare_digest(token, PASSWORD):
        raise HTTPException(401, "סיסמה שגויה")


def worker() -> None:
    while True:
        jid = _q.get()
        job = _read(jid)
        job.update(status="running", started_at=time.time())
        _write(jid, job)

        def progress(stage, pct, msg=""):
            j = _read(jid); j.update(stage=stage, progress=pct, message=msg); _write(jid, j)

        try:
            opts = pipeline.JobOptions(n_clips=job["n_clips"], min_len=job["min_len"], max_len=job["max_len"])
            src = _job_path(jid) / job["filename"]
            result = pipeline.process(src, _job_path(jid), opts, progress)
            job = _read(jid); job.update(status="done", result=result, finished_at=time.time(), progress=100)
        except Exception as e:  # noqa: BLE001
            job = _read(jid); job.update(status="error", error=str(e)[:500], finished_at=time.time())
        _write(jid, job)
        _q.task_done()


threading.Thread(target=worker, daemon=True).start()


@app.get("/", response_class=HTMLResponse)
def index():
    return (Path(__file__).parent / "static" / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
def health():
    return {"ok": True, "jobs": len(list(JOBS.glob("*/job.json"))), "stt": os.environ.get("STT_BACKEND", "auto"),
            "planner": "claude" if os.environ.get("ANTHROPIC_API_KEY") else "heuristic", "auth": bool(PASSWORD)}


@app.post("/api/jobs", dependencies=[Depends(auth)])
async def create_job(file: UploadFile = File(...), n_clips: int = Form(8), min_len: float = Form(25), max_len: float = Form(60)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"סוג קובץ לא נתמך: {ext}")
    if not (1 <= n_clips <= 30) or not (10 <= min_len < max_len <= 180):
        raise HTTPException(400, "פרמטרים לא תקינים")
    jid = str(uuid.uuid4())
    jdir = _job_path(jid); jdir.mkdir()
    dst = jdir / f"source{ext}"
    size = 0
    with dst.open("wb") as fh:
        while chunk := await file.read(8 * 1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD:
                fh.close(); shutil.rmtree(jdir, ignore_errors=True)
                raise HTTPException(413, "הקובץ גדול מדי")
            fh.write(chunk)
    job = {"id": jid, "filename": dst.name, "original": file.filename, "size": size, "n_clips": n_clips, "min_len": min_len,
           "max_len": max_len, "status": "queued", "progress": 0, "stage": "queued", "message": "בתור", "created_at": time.time()}
    _write(jid, job)
    _q.put(jid)
    return job


@app.get("/api/jobs", dependencies=[Depends(auth)])
def list_jobs():
    jobs = [json.loads(p.read_text(encoding="utf-8")) for p in JOBS.glob("*/job.json")]
    jobs.sort(key=lambda j: -j.get("created_at", 0))
    for j in jobs:
        j.pop("result", None)
    return jobs[:50]


@app.get("/api/jobs/{jid}", dependencies=[Depends(auth)])
def get_job(jid: str):
    return _read(jid)


@app.delete("/api/jobs/{jid}", dependencies=[Depends(auth)])
def delete_job(jid: str):
    p = _job_path(jid)
    if not p.exists():
        raise HTTPException(404)
    shutil.rmtree(p, ignore_errors=True)
    return {"ok": True}


@app.get("/api/jobs/{jid}/clips/{name}", dependencies=[Depends(auth)])
def clip_file(jid: str, name: str):
    if "/" in name or name.startswith("."):
        raise HTTPException(400)
    p = _job_path(jid) / "clips" / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(str(p), filename=name)


@app.exception_handler(HTTPException)
async def http_exc(_, exc: HTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
