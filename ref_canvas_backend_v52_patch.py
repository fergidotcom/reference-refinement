from __future__ import annotations
import os, re, json, pathlib, datetime, urllib.parse, time
from typing import List, Dict, Any, Optional, Tuple

# --- base app (reuse if present) ---
try:
    from ref_canvas_backend_v42 import app as base_app  # type: ignore
except Exception:
    try:
        from ref_canvas_backend_v41 import app as base_app  # type: ignore
    except Exception:
        from fastapi import FastAPI as _FA
        base_app = _FA()
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app: FastAPI = base_app
try:
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
except Exception:
    pass

ROOT = pathlib.Path.cwd()
DECISIONS = ROOT / "decisions.txt"
EXPORT_V50 = ROOT / "enhanced_master_v50.txt"
OVERRIDES = ROOT / "overrides_v52.ndjson"
SECRETS_FILE = ROOT / "secrets.yaml"

# -------- utils --------
def _now() -> str: return datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
def _domain(u: str) -> str:
    m = re.match(r'^https?://([^/]+)', u or '')
    return (m.group(1).lower() if m else '')
def _pdf(u: str) -> bool: return (u or '').lower().split('?',1)[0].endswith('.pdf')

def _mask(s: str) -> str:
    if not s: return ""
    if len(s) <= 8: return s[0:2] + "…" + s[-2:]
    return s[0:4] + "…" + s[-4:]

# lightweight HTTP (requests optional)
try:
    import requests  # type: ignore
except Exception:
    requests = None

def _http_json(method: str, url: str, *, headers=None, params=None, json_body=None, timeout=8) -> Tuple[int, Dict[str, Any]]:
    if requests:
        try:
            r = requests.request(method.upper(), url, headers=headers, params=params, json=json_body, timeout=timeout)
            try: return r.status_code, r.json()
            except Exception: return r.status_code, {"text": r.text}
        except Exception as e:
            return 599, {"error": str(e)}
    # urllib fallback
    try:
        from urllib.request import Request, urlopen
        if params:
            q = urllib.parse.urlencode(params)
            url = url + ("&" if "?" in url else "?") + q
        data = None
        req = Request(url, method=method.upper(), headers=headers or {})
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            req.add_header("Content-Type", "application/json")
        with urlopen(req, data=data, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            try: return resp.getcode(), json.loads(text)
            except Exception: return resp.getcode(), {"text": text}
    except Exception as e:
        return 599, {"error": str(e)}

# -------- secrets loader (yaml-ish without dep) --------
def _load_secrets() -> Dict[str, str]:
    data: Dict[str,str] = {}
    if not SECRETS_FILE.exists(): return data
    for ln in SECRETS_FILE.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r'\s*([A-Za-z0-9_]+)\s*:\s*(.+)\s*$', ln)
        if not m: continue
        k,v = m.group(1).strip(), re.sub(r'^[\'"]|[\'"]$', '', m.group(2).strip())
        data[k]=v
    # env aliases
    if data.get("GOOGLE_CSE_API_KEY"): os.environ["GOOGLE_CSE_API_KEY"]=data["GOOGLE_CSE_API_KEY"]
    if data.get("GOOGLE_CSE_CX"): os.environ["GOOGLE_CSE_CX"]=data["GOOGLE_CSE_CX"]
    if data.get("OPENAI_API_KEY"): os.environ["OPENAI_API_KEY"]=data["OPENAI_API_KEY"]
    return data
_SECRETS = _load_secrets()

# -------- logging --------
def _log(kind: str, payload: Dict[str, Any]):
    try:
        rec = {"ts": _now(), "kind": kind, **payload}
        with OVERRIDES.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass

# -------- robust decisions.txt parser (fixes missing titles) --------
def _parse_line(line: str) -> Optional[Dict[str, Any]]:
    s = line.rstrip("\n")
    m_rid = re.match(r'^\[(\d+)\]\s*(.*)$', s)
    if not m_rid: return None
    rid = int(m_rid.group(1)); body = m_rid.group(2)

    # pull fields we know live at the tail
    m_rel = re.search(r'(?:^|\s)Relevance:\s*(.*?)(?=\s+PRIMARY_URL|\s+SECONDARY_URL|$)', body, flags=re.IGNORECASE)
    relevance = (m_rel.group(1).strip() if m_rel else "")
    primary = (re.search(r'PRIMARY_URL\[(.*?)\]', body) or [None,""])[1]
    secondary = (re.search(r'SECONDARY_URL\[(.*?)\]', body) or [None,""])[1]

    # strip trailing tech fields for biblio head
    head = body
    if m_rel: head = head[:m_rel.start()]
    head = re.sub(r'\s*PRIMARY_URL\[.*?\].*$', '', head).strip()

    # expected head like: "Author, A (1999). Title: Subtitle"
    y = re.search(r'\((\d{4})\)', head)
    year = int(y.group(1)) if y else None
    if y:
        author = head[:y.start()].strip().rstrip('.')
        tail = head[y.end():].strip()
        tail = re.sub(r'^[\s\.\-–—:]+', '', tail)  # drop leading delimiters after year
        title = tail.strip()
    else:
        # fallback: try quoted title anywhere
        mqt = re.search(r'["“](.+?)["”]', head)
        title = mqt.group(1).strip() if mqt else ""
        # author then is before first period, otherwise everything minus title
        author = head.split('.',1)[0].strip()

    return {
        "rid": rid,
        "author": author,
        "year": year,
        "title_other": title,
        "title": title,
        "relevance": relevance,
        "primary_url": primary.strip(),
        "secondary_url": secondary.strip(),
        "raw": s
    }

def _iter_decisions():
    if not DECISIONS.exists(): return
    with DECISIONS.open('r', encoding='utf-8', errors='replace') as f:
        for ln in f:
            if not ln.strip(): continue
            rec = _parse_line(ln)
            if rec: yield rec

def _matches_filters(rec: Dict[str, Any], qp: Dict[str, Any]) -> bool:
    q = (qp.get("q") or "").lower()
    if q:
        hay = " ".join([str(rec.get(k,"")) for k in ("author","title","title_other","relevance","raw")]).lower()
        if q not in hay: return False
    missing = (qp.get("missing") or "any").lower()
    p, s = bool(rec.get("primary_url")), bool(rec.get("secondary_url"))
    if missing == "primary" and p: return False
    if missing == "secondary" and s: return False
    if missing == "none" and (not p or not s): return False
    has_pdf = (qp.get("has_pdf") or "any").lower()
    pp, ss = _pdf(rec.get("primary_url","")), _pdf(rec.get("secondary_url",""))
    if has_pdf == "primary" and not pp: return False
    if has_pdf == "secondary" and not ss: return False
    if has_pdf == "both" and not (pp and ss): return False
    if has_pdf == "none" and (pp or ss): return False
    domains = [d.strip().lower() for d in (qp.get("domain") or "").split(",") if d.strip()]
    if domains:
        doms = [_domain(rec.get("primary_url","")), _domain(rec.get("secondary_url",""))]
        if not any(any(d in x for d in domains) for x in doms): return False
    if qp.get("year_min") is not None and (rec.get("year") or 0) < int(qp["year_min"]): return False
    if qp.get("year_max") is not None and (rec.get("year") or 0) > int(qp["year_max"]): return False
    return True

def _sort_key(rec: Dict[str,Any], field: str):
    if field == "rid": return rec.get("rid", 0)
    if field == "year": return rec.get("year") or 0
    if field == "author": return (rec.get("author") or "").lower()
    if field == "has_primary": return 0 if rec.get("primary_url") else 1
    return rec.get("rid", 0)

# -------- health & self-test --------
def get_health():
    return {
        "root": str(ROOT),
        "decisions_exists": DECISIONS.exists(),
        "export_v50_exists": EXPORT_V50.exists(),
        "overrides_exists": OVERRIDES.exists(),
        "secrets_present": SECRETS_FILE.exists(),
        "secrets_keys": {
            "GOOGLE_CSE_API_KEY": _mask(os.getenv("GOOGLE_CSE_API_KEY","")),
            "GOOGLE_CSE_CX": _mask(os.getenv("GOOGLE_CSE_CX","")),
            "OPENAI_API_KEY": _mask(os.getenv("OPENAI_API_KEY","")),
        },
    }

def get_selftest():
    out = {"internet": False, "cse": {"ok": False, "status": None}, "openai": {"ok": False, "status": None}}
    # internet (fast no-content endpoint)
    try:
        code, _ = _http_json("GET", "https://www.google.com/generate_204", timeout=5)
        out["internet"] = code in (204,200)
    except Exception: pass
    # CSE
    key, cx = os.getenv("GOOGLE_CSE_API_KEY"), os.getenv("GOOGLE_CSE_CX")
    if key and cx and out["internet"]:
        code, js = _http_json("GET", "https://www.googleapis.com/customsearch/v1",
                              params={"key": key, "cx": cx, "q": "test", "num": 1}, timeout=7)
        out["cse"] = {"ok": (code==200 and bool(js.get("items"))), "status": code, "sample_title": (js.get("items",[{}])[0].get("title") if isinstance(js.get("items"), list) else None)}
    # OpenAI
    if os.getenv("OPENAI_API_KEY") and out["internet"]:
        code, js = _http_json("POST", "https://api.openai.com/v1/chat/completions",
                              headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}", "Content-Type":"application/json"},
                              json_body={"model":"gpt-4o-mini", "messages":[{"role":"system","content":"You reply 'ok'."},{"role":"user","content":"Ping."}], "temperature":0},
                              timeout=9)
        ok = (code==200 and isinstance(js.get("choices"), list))
        out["openai"] = {"ok": ok, "status": code}
    _log("selftest", out)
    return out

# -------- Suggest (LLM w/ fallback) --------
def _suggest_heuristic(author: str, title: str, year: str, rel: str) -> List[str]:
    parts = []
    if title: parts.append(f'"{title}"')
    if author: parts.append(author)
    core = " ".join(parts).strip()
    qs = []
    if core: qs += [core, f'{core} pdf', f'{core} review']
    if author and title:
        qs += [f'{author} "{title}" site:doi.org', f'{author} "{title}" site:worldcat.org', f'{author} "{title}" publisher']
    if year and core: qs.append(f'{core} {year}')
    if rel:
        frag = " ".join(rel.split()[:4])
        if core: qs.append(f'{core} {frag}')
    # dedupe & trim
    out=[]; seen=set()
    for q in qs:
        q=q.strip()
        if not q or q in seen: continue
        seen.add(q); out.append(q)
    return out[:8]

def _suggest_llm(author: str, title: str, year: str, rel: str) -> Optional[List[str]]:
    api = os.getenv("OPENAI_API_KEY")
    if not api: return None
    prompt = {
        "model": "gpt-4o-mini",
        "temperature": 0.2,
        "messages": [
            {"role":"system","content":"You are a search-query planner for academic/monograph references. Return strictly JSON: {\"queries\":[...]} with 6–8 high-yield Google queries. Prefer exact quoted titles, add site:doi.org, site:worldcat.org, publisher/press sites, and 'review' variants. No commentary."},
            {"role":"user","content": f"Author: {author}\nTitle: {title}\nYear: {year}\nRelevance: {rel[:600]}\nReturn JSON only."}
        ]
    }
    code, js = _http_json("POST", "https://api.openai.com/v1/chat/completions",
                          headers={"Authorization": f"Bearer {api}","Content-Type":"application/json"}, json_body=prompt, timeout=15)
    if code!=200 or "choices" not in js: return None
    text = (js["choices"][0]["message"]["content"] or "").strip()
    m = re.search(r'\{[\s\S]*\}', text)
    try:
        obj = json.loads(m.group(0) if m else text)
        arr = [q.strip() for q in obj.get("queries", []) if isinstance(q, str)]
        return arr[:8] if arr else None
    except Exception:
        lines = [re.sub(r'^[\-\d\.\s]+','',x).strip() for x in text.splitlines() if x.strip()]
        return lines[:8] if lines else None

def post_plan_queries_v4(payload: Dict[str, Any] = Body(...)):
    author = (payload.get("author") or "").strip()
    title  = (payload.get("title") or payload.get("title_other") or "").strip()
    year   = str(payload.get("year") or "").strip()
    rel    = (payload.get("relevance") or "").strip()
    use_llm = bool(payload.get("llm"))
    queries = None
    if use_llm:
        queries = _suggest_llm(author, title, year, rel)
        if queries:
            _log("queries_llm", {"rid": payload.get("rid"), "queries": queries})
    if not queries:
        queries = _suggest_heuristic(author, title, year, rel)
        _log("queries_fallback", {"rid": payload.get("rid"), "queries": queries})
    return {"queries": queries}

# -------- Run (Google CSE) --------
def get_search_llm2(q: Optional[str] = None, limit: int = 10, start: int = 1):
    key = os.getenv("GOOGLE_CSE_API_KEY") or os.getenv("GOOGLE_API_KEY")
    cx  = os.getenv("GOOGLE_CSE_CX") or os.getenv("GOOGLE_CSE_ID")
    if not key or not cx or not q:
        return {"results": []}
    params = {"key": key, "cx": cx, "q": q, "num": max(1,min(int(limit or 10),10)), "start": max(1,int(start or 1))}
    code, js = _http_json("GET", "https://www.googleapis.com/customsearch/v1", params=params, timeout=9)
    items = []
    for it in (js.get("items") or []):
        items.append({
            "url": it.get("link",""),
            "title": it.get("title",""),
            "snippet": it.get("snippet","")
        })
    _log("search_run", {"q": q, "count": len(items), "status": code})
    return {"results": items}

# -------- Auto-rank (heuristic + optional LLM) --------
def _tok(s:str)->List[str]: return re.findall(r"[A-Za-z0-9]+", (s or "").lower())
def _overlap(a:List[str], b:List[str])->int: return len(set(a)&set(b))

def _score_primary(u: str, meta: Dict[str,Any], author:str, title:str, year:int) -> int:
    d = _domain(u); uL = (u or "").lower(); s = 0
    if "doi.org" in d: s += 12
    if any(x in d for x in ["press.","university","mitpress","uchicago","cambridge","oxford","princeton","stanfordpress","upenn.edu"]): s += 9
    if any(x in d for x in ["sagepub","tandfonline","springer","wiley","sciencedirect","jstor","aps.org","pnas.org","nature.com","science.org","oup.com","cambridge.org","oxfordacademic"]): s += 8
    if any(x in d for x in ["amazon.","goodreads."]): s -= 3
    if any(x in d for x in ["wikipedia.org","researchgate.net","academia.edu","reddit.","quora."]): s -= 5
    if uL.endswith(".pdf"): s += 3
    tmeta = " ".join([meta.get("title",""), meta.get("snippet","")])
    s += 2*_overlap(_tok(title), _tok(tmeta))
    s += 1*_overlap(_tok(author), _tok(tmeta))
    if year and re.search(rf"\b{year}\b", tmeta): s += 2
    return s

def _score_secondary(u: str, meta: Dict[str,Any], author:str, title:str, primary_domain:str) -> int:
    d = _domain(u); uL = (u or "").lower(); s = 0
    if d == primary_domain: s -= 50
    if "worldcat.org" in d or "oclc.org" in d: s += 10
    if d.endswith(".edu") and "library" in d: s += 8
    if any(x in d for x in ["jstor","gale","britannica","archive.org","hathitrust.org","books.google.","muse.jhu.edu"]): s += 6
    if "doi.org" in d: s -= 2
    if uL.endswith(".pdf"): s += 2
    tmeta = " ".join([meta.get("title",""), meta.get("snippet","")])
    s += 2*_overlap(_tok(title), _tok(tmeta))
    s += 1*_overlap(_tok(author), _tok(tmeta))
    return s

def _rank_llm(author:str, title:str, year:int, cands:List[Dict[str,Any]])->Optional[Dict[str,str]]:
    api = os.getenv("OPENAI_API_KEY")
    if not api or not cands: return None
    rows = [{"url":c.get("url",""),"title":c.get("title",""),"snippet":c.get("snippet",""),"domain":_domain(c.get("url",""))} for c in cands][:20]
    sys = "Pick the best PRIMARY (DOI/publisher/university/journal; PDF bonus) and a SECONDARY from an independent domain (WorldCat/JSTOR/library/Archive preferred). Return strictly JSON: {\"primary\":\"URL\",\"secondary\":\"URL\"}."
    usr = {"author":author, "title":title, "year":year, "candidates":rows}
    code, js = _http_json("POST","https://api.openai.com/v1/chat/completions",
                          headers={"Authorization": f"Bearer {api}","Content-Type":"application/json"},
                          json_body={"model":"gpt-4o-mini","temperature":0.2,"messages":[{"role":"system","content":sys},{"role":"user","content":json.dumps(usr,ensure_ascii=False)}]}, timeout=20)
    if code!=200 or "choices" not in js: return None
    text = (js["choices"][0]["message"]["content"] or "").strip()
    m = re.search(r'\{[\s\S]*\}', text)
    try:
        obj = json.loads(m.group(0) if m else text)
        if isinstance(obj.get("primary",""), str) and isinstance(obj.get("secondary",""), str):
            return {"primary": obj["primary"], "secondary": obj["secondary"]}
    except Exception:
        return None

def post_rank_candidates_v4(payload: Dict[str, Any] = Body(...)):
    author=(payload.get("author") or "").strip()
    title =(payload.get("title") or payload.get("title_other") or "").strip()
    year  = int(payload.get("year") or 0)
    cands = payload.get("candidates") or payload.get("results") or []
    metas={}; urls=[]; seen=set()
    for c in cands:
        u=(c.get("url") or "").strip()
        if not u or u in seen: continue
        seen.add(u); urls.append(u)
        metas[u]={"title":c.get("title",""),"snippet":c.get("snippet","")}
    # optional LLM
    llm = bool(payload.get("llm"))
    if llm:
        pick = _rank_llm(author, title, year, cands)
        if pick:
            _log("rank_llm", {"rid": payload.get("rid"), **pick})
            return {"primary": pick["primary"], "secondary": pick["secondary"]}
    # heuristic
    primary=None; best=-10**9
    for u in urls:
        s=_score_primary(u, metas.get(u,{}), author, title, year)
        if s>best: primary,best=u,s
    sec=None; best=-10**9; pdom=_domain(primary or "")
    for u in urls:
        s=_score_secondary(u, metas.get(u,{}), author, title, pdom)
        if s>best: sec,best=u,s
    _log("rank_auto", {"rid": payload.get("rid"), "primary": primary or "", "secondary": sec or ""})
    return {"primary": primary or "", "secondary": sec or ""}

# -------- save / finalize / overrides --------
def post_save_decision(payload: Dict[str, Any] = Body(...)):
    rid = payload.get("rid")
    if not rid: raise HTTPException(400, "rid required")
    rid = int(rid)
    relevance = (payload.get("relevance") or "").strip()
    purl = (payload.get("primary_url") or "").strip()
    surl = (payload.get("secondary_url") or "").strip()
    old: Dict[str,Any] = {}
    lines=[]; updated=False
    if DECISIONS.exists():
        with DECISIONS.open('r', encoding='utf-8', errors='replace') as f:
            for ln in f:
                m = re.match(r'^\[(\d+)\]', ln)
                if m and int(m.group(1))==rid:
                    old = _parse_line(ln) or {}
                    line = ln.rstrip("\n")
                    if "Relevance:" in line:
                        line = re.sub(r'(Relevance:\s*)(.*?)(\s+PRIMARY_URL|\s+SECONDARY_URL|$)', lambda m: m.group(1)+relevance+(m.group(3) or ""), line, count=1)
                    else:
                        idx=line.find('PRIMARY_URL[')
                        if idx!=-1: line = line[:idx] + f' Relevance: {relevance} ' + line[idx:]
                        else: line = line + f' Relevance: {relevance}'
                    def set_field(s, field, val):
                        pat = re.compile(rf'{field}\[(.*?)\]')
                        if pat.search(s): return pat.sub(f'{field}[{val}]', s, count=1)
                        return s.strip() + f' {field}[{val}]'
                    if purl: line=set_field(line, "PRIMARY_URL", purl)
                    if surl: line=set_field(line, "SECONDARY_URL", surl)
                    lines.append(line+"\n"); updated=True
                else:
                    lines.append(ln)
    if not updated:
        stub = f'[{rid}] . Relevance: {relevance} PRIMARY_URL[{purl}] SECONDARY_URL[{surl}]'
        lines.append(stub+"\n")
    DECISIONS.write_text("".join(lines), encoding="utf-8")
    # diff log
    if (old.get("relevance") or "") != relevance: _log("relevance_edit", {"rid": rid, "before": old.get("relevance",""), "after": relevance})
    if (old.get("primary_url") or "") != purl:   _log("primary_override", {"rid": rid, "before": old.get("primary_url",""), "after": purl})
    if (old.get("secondary_url") or "") != surl: _log("secondary_override", {"rid": rid, "before": old.get("secondary_url",""), "after": surl})
    return {"ok": True, "rid": rid}

def _sanitize_line(ln: str) -> str:
    ln = re.sub(r'\s*FLAGS\[[^\]]*\]\s*', ' ', ln).strip()
    ln = re.sub(r'\s{2,}', ' ', ln)
    return ln

def _finalize_collect(payload: Dict[str, Any]) -> List[str]:
    mode = (payload.get("mode") or "").lower()
    rids = payload.get("rids") or []
    filters = payload.get("filters") or {}
    if not DECISIONS.exists(): raise HTTPException(404, "decisions.txt not found")
    lines = DECISIONS.read_text(encoding='utf-8', errors='replace').splitlines()
    pick: List[str] = []
    if mode == "selected" and rids:
        sset = {int(x) for x in rids if isinstance(x,(int,str)) and str(x).isdigit()}
        for ln in lines:
            m = re.match(r'^\[(\d+)\]', ln)
            if m and int(m.group(1)) in sset: pick.append(ln)
    else:
        for rec in _iter_decisions():
            if _matches_filters(rec, filters): pick.append(rec["raw"])
    return pick

def post_finalize_v50(payload: Dict[str, Any] = Body(...)):
    chosen = _finalize_collect(payload)
    existing: Dict[int, str] = {}
    if EXPORT_V50.exists():
        for ln in EXPORT_V50.read_text(encoding='utf-8', errors='replace').splitlines():
            m = re.match(r'^\[(\d+)\]', ln)
            if m: existing[int(m.group(1))] = ln
    for ln in chosen:
        m = re.match(r'^\[(\d+)\]', ln)
        if not m: continue
        rid = int(m.group(1))
        existing[rid] = _sanitize_line(ln)
    out = [existing[k] for k in sorted(existing.keys())]
    EXPORT_V50.write_text("\n".join(out) + ("\n" if out else ""), encoding='utf-8')
    return {"ok": True, "total_finalized_unique": len(existing), "export": str(EXPORT_V50)}

def post_finalize_v43(payload: Dict[str, Any] = Body(...)):
    return post_finalize_v50(payload)

def post_log_override(payload: Dict[str, Any] = Body(...)):
    rid = payload.get("rid"); kind = payload.get("kind") or "override"
    if not rid: raise HTTPException(400, "rid required")
    _log(kind, {"rid": int(rid), "before": payload.get("before"), "after": payload.get("after"), "note": payload.get("note")})
    return {"ok": True}

def get_overrides(rid: Optional[int] = None, limit: int = 50):
    if not OVERRIDES.exists(): return {"items": []}
    out=[]
    for ln in OVERRIDES.read_text(encoding="utf-8", errors="replace").splitlines():
        if not ln.strip(): continue
        try:
            obj=json.loads(ln)
            if rid is not None and int(obj.get("rid", -1)) != int(rid): continue
            out.append(obj)
        except Exception: pass
    return {"items": out[-int(limit):]}

# register routes (idempotent)
def _has_route(path: str, method: str) -> bool:
    m = method.upper()
    for r in app.router.routes:
        p = getattr(r, "path", None); ms = getattr(r, "methods", None)
        if p == path and ms and m in ms: return True
    return False
def _add_get(path, fn):  # only if missing
    if not _has_route(path, "GET"): app.add_api_route(path, fn, methods=["GET"])
def _add_post(path, fn):
    if not _has_route(path, "POST"): app.add_api_route(path, fn, methods=["POST"])

_add_get("/api/health", get_health)
_add_get("/api/selftest", get_selftest)
_add_get("/api/decisions", lambda **kw: {"items":[{**r, "title": r.get("title") or r.get("title_other","")} for r in [x for x in _iter_decisions() if _matches_filters(x, kw)]][(max(0,(int(kw.get("page",1))-1)*int(kw.get("page_size",50)))):][:int(kw.get("page_size",50))], "total": sum(1 for _ in _iter_decisions())})
_add_get("/api/decisions/stats", lambda: (lambda total=0,both=0,mp=0,ms=0,pp=0,ss=0: (lambda:
    {"total":total,"both":both,"missing_primary":mp,"missing_secondary":ms,"pdf_primary":pp,"pdf_secondary":ss})()
)())
# replace previous inline ones with full functions when present:
app.router.routes = [r for r in app.router.routes if getattr(r,'path',None) != "/api/decisions/stats"]
app.add_api_route("/api/decisions/stats", lambda: (lambda total=0,both=0,mp=0,ms=0,pp=0,ss=0: (lambda:
    (lambda: ([_ for _ in (_ for _ in _iter_decisions())]))()
)())(), methods=["GET"])  # placeholder noop; true stats below
# true stats:
def _stats():
    total=both=mp=ms=pp=ss=0
    for rec in _iter_decisions():
        total+=1
        p,s=bool(rec.get("primary_url")), bool(rec.get("secondary_url"))
        if p and s: both+=1
        if not p: mp+=1
        if not s: ms+=1
        if _pdf(rec.get("primary_url","")): pp+=1
        if _pdf(rec.get("secondary_url","")): ss+=1
    return {"total": total, "both": both, "missing_primary": mp, "missing_secondary": ms, "pdf_primary": pp, "pdf_secondary": ss}
app.router.routes = [r for r in app.router.routes if getattr(r,'path',None) != "/api/decisions/stats"]
app.add_api_route("/api/decisions/stats", _stats, methods=["GET"])

_add_post("/api/plan_queries_v4", post_plan_queries_v4)
_add_get("/api/search_llm2", get_search_llm2)     # GET for the UI
_add_post("/api/rank_candidates_v4", post_rank_candidates_v4)
_add_post("/api/save_decision", post_save_decision)
_add_post("/api/finalize_v50", post_finalize_v50)
_add_post("/api/finalize_v43", post_finalize_v43)
_add_post("/api/log_override", post_log_override)
_add_get("/api/overrides", get_overrides)
