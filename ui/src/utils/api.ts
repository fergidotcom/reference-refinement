export const BASE_URL: string = (window as any).__RR_BASE_URL__ || "https://localhost:8443";
export async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${BASE_URL}${path}`, { ...opts, headers: {"content-type":"application/json", ...(opts.headers||{})}});
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}: ${await r.text().catch(()=> "")}`);
  return (r.headers.get("content-type")||"").includes("application/json") ? r.json() : r.text();
}
export function collapseOneLine(s?: string){ return (s||"").replace(/\s+/g," ").trim(); }
export function safeDomain(u: string){ try{ return new URL(u).hostname.replace(/^www\./i,""); }catch{ return ""; } }
