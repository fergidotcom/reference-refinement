/** Single-record Workbench — Load · Plan · Run (modular) */
import React from "react";
import { Section } from "./components/Section";
import { Button, Input, Textarea, Copyable } from "./components/UI";
import { api, BASE_URL, collapseOneLine, safeDomain } from "./utils/api";
import { useDebounced } from "./hooks/useDebounced";

type Ref = { rid:number; author:string; title:string; year:string; relevance:string; biblio_extra?:string };
type Candidate = { url:string; title?:string; domain?:string };

export default function SingleRecordWorkbench(){
  const [rid, setRid] = React.useState(1);
  const [ref, setRef] = React.useState<Ref|null>(null);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [planQueries, setPlanQueries] = React.useState<string[]>([]);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [primary, setPrimary] = React.useState<Candidate|null>(null);
  const [secondary, setSecondary] = React.useState<Candidate|null>(null);
  const [scores, setScores] = React.useState<any[]>([]);
  const [author,setAuthor] = React.useState(""); const [title,setTitle] = React.useState("");
  const [year,setYear] = React.useState("");     const [relevance,setRelevance] = React.useState("");
  const [biblioExtra,setBiblioExtra] = React.useState(""); const [saving,setSaving] = React.useState(false);
  const [baseUrl, setBaseUrl] = React.useState(BASE_URL); const debouncedBaseUrl = useDebounced(baseUrl, 300);
  React.useEffect(()=>{ (window as any).__RR_BASE_URL__ = debouncedBaseUrl; },[debouncedBaseUrl]);

  function resetForNewRecord(){ setRef(null); setPlanQueries([]); setCandidates([]); setPrimary(null); setSecondary(null); setScores([]);
    setError(""); setAuthor(""); setTitle(""); setYear(""); setRelevance(""); setBiblioExtra(""); }

  function fromRef(r:Ref){ setAuthor(r.author||""); setTitle(r.title||""); setYear(r.year||"");
    setRelevance((r.relevance||"").replace(/\s+/g," ").trim()); setBiblioExtra(r.biblio_extra||""); }

  async function tryLoadDecision(r:number){
    try{ const d = await api(`/api/decision/${r}`); 
      if((d as any)?.primary_url) setPrimary({ url:(d as any).primary_url, domain:safeDomain((d as any).primary_url) });
      if((d as any)?.secondary_url) setSecondary({ url:(d as any).secondary_url, domain:safeDomain((d as any).secondary_url) });
    }catch{/* none */}
  }

  async function loadRid(n:number){
    setStatus("Loading…"); resetForNewRecord();
    try{ const [ref0] = await Promise.all([api(`/api/reference/${n}`)]);
      setRef(ref0); setRid(n); fromRef(ref0); await tryLoadDecision(n); setStatus("Loaded");
    }catch(e:any){ setError(String(e)); setStatus("Load failed"); }
  }

  async function nextRid(){ setStatus("Loading next…");
    try{ const nx = await api(`/api/next_reference/${rid}`); await loadRid((nx as any)?.rid ?? (rid+1)); }
    catch(e:any){ setError(String(e)); setStatus("Next failed"); } }

  async function plan(){ setStatus("Planning…"); setError("");
    try{ const body = { rid, author:author||ref?.author||"", title:title||ref?.title||"", year:year||ref?.year||"", relevance:relevance||ref?.relevance||"" };
      const out = await api(`/api/plan_queries_v3`, {method:"POST", body: JSON.stringify(body)}); setPlanQueries((out as any).queries||[]); setStatus("Planned"); }
    catch(e:any){ setError(String(e)); setStatus("Plan failed"); } }

  async function run(){ setStatus("Running…"); setError("");
    try{ const merged = new Map<string,Candidate>();
      for (const q of planQueries.filter(Boolean)){ const items = await api(`/api/search_llm2?q=${encodeURIComponent(q)}&limit=12`) as any[];
        for (const it of (items||[])){ const u=(it?.link||it?.url||"").trim(); if(!u) continue; if(!merged.has(u)) merged.set(u,{url:u,title:it?.title||"",domain:safeDomain(u)});}}
      const cand = Array.from(merged.values()); setCandidates(cand);
      const ranked = await api(`/api/rank_candidates_v3`, {method:"POST", body: JSON.stringify({rid,author,title,year,relevance,candidates:cand})}) as any;
      setScores(ranked?.scores||[]); setPrimary(ranked?.primary||null); setSecondary(ranked?.secondary||null); setStatus("Ran");
    }catch(e:any){ setError(String(e)); setStatus("Run failed"); } }

  async function commit(){ setSaving(true); setError(""); setStatus("Saving…");
    try{ if(!(author&&title&&year&&relevance)) throw new Error("Author/Title/Year/Relevance must be non-empty");
      if(!(primary?.url&&secondary?.url)) throw new Error("Both Primary and Secondary URLs must be present");
      await api(`/api/save_decision`, {method:"POST", body: JSON.stringify({rid,author,title,year,relevance:collapseOneLine(relevance),biblio_extra:biblioExtra,primary_url:primary.url,secondary_url:secondary.url})});
      setStatus("Saved"); } catch(e:any){ setError(String(e)); setStatus("Save failed"); } finally{ setSaving(false);} }

  React.useEffect(()=>{ loadRid(rid); },[]);
  return (<div className="p-6 bg-gray-50 min-h-screen"><div className="max-w-6xl mx-auto grid gap-5">
    <header className="flex items-center justify-between"><h1 className="text-2xl font-bold">Single-record Workbench — Load · Plan · Run</h1>
      <div className="flex items-center gap-2"><Input value={baseUrl} onChange={setBaseUrl} placeholder="Base URL"/><Button variant="ghost" onClick={()=>loadRid(rid)}>Reload</Button></div>
    </header>
    <Section title="Load" right={<div className="flex items-center gap-2"><Button variant="ghost" onClick={()=>nextRid()}>Next</Button><Button variant="ghost" onClick={()=>loadRid(rid)}>Load</Button></div>}>
      <div className="grid md:grid-cols-[120px_1fr_1fr_120px] gap-3 items-start">
        <div><label className="text-sm text-gray-600">RID</label><Input value={String(rid)} onChange={v=>setRid(Number(v)||0)}/></div>
        <div><label className="text-sm text-gray-600">Author</label><Input value={author} onChange={setAuthor}/></div>
        <div><label className="text-sm text-gray-600">Title</label><Input value={title} onChange={setTitle}/></div>
        <div><label className="text-sm text-gray-600">Year</label><Input value={year} onChange={setYear}/></div>
        <div className="md:col-span-4"><label className="text-sm text-gray-600">Relevance (single line)</label><Textarea rows={3} value={relevance} onChange={setRelevance} placeholder="150–200 words"/></div>
        <div className="md:col-span-4"><label className="text-sm text-gray-600">Other Biblio (auto-parsed; optional)</label><Textarea rows={2} value={biblioExtra} onChange={setBiblioExtra} placeholder="Publisher, place, edition, ISBN"/></div>
        <div className="md:col-span-4 text-sm text-gray-600 flex items-center gap-3"><span>Status: <b>{status}</b></span>{error && <span className="text-rose-700">{String(error)}</span>}</div>
      </div>
    </Section>
    <Section title="Plan" right={<Button onClick={()=>plan()}>Plan</Button>}>
      <div className="grid gap-2">
        <div className="text-sm text-gray-600">Editable queries (tweak as needed)</div>
        <div className="grid gap-2">{planQueries.length===0 && <div className="text-gray-500">No queries yet. Click Plan.</div>}
          {planQueries.map((q,idx)=>(<div key={idx} className="flex items-center gap-2">
            <input className="flex-1 rounded-2xl border border-gray-300 p-2" value={q} onChange={e=>{const v=[...planQueries]; v[idx]=e.target.value; setPlanQueries(v);}}/>
            <Button variant="ghost" onClick={()=>{const v=[...planQueries]; v.splice(idx,1); setPlanQueries(v);}}>Remove</Button></div>))}
        </div>
        <div><Button variant="ghost" onClick={()=>setPlanQueries([...planQueries,""])}>Add Query</Button></div>
      </div>
    </Section>
    <Section title="Decision & Commit" right={<Button onClick={()=>commit()} disabled={saving}>Commit</Button>}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><div className="text-sm text-gray-600">Primary URL</div>
          {primary ? (<div className="space-y-2"><Copyable label="Primary" text={primary.url}/><a className="text-indigo-700 underline break-all" href={primary.url} target="_blank" rel="noreferrer">Open Primary</a></div>) : (<div className="text-gray-500">(none)</div>)}
        </div>
        <div className="space-y-2"><div className="text-sm text-gray-600">Secondary URL</div>
          {secondary ? (<div className="space-y-2"><Copyable label="Secondary" text={secondary.url}/><a className="text-indigo-700 underline break-all" href={secondary.url} target="_blank" rel="noreferrer">Open Secondary</a></div>) : (<div className="text-gray-500">(none)</div>)}
        </div>
      </div>
    </Section>
    <Section title="Candidates" right={<Button onClick={()=>run()}>Run</Button>}>
      <div className="overflow-auto"><table className="min-w-full border-separate border-spacing-y-2">
        <thead><tr><th className="text-left text-sm text-gray-600">Domain</th><th className="text-left text-sm text-gray-600">Title</th><th className="text-left text-sm text-gray-600">URL</th><th className="text-left text-sm text-gray-600">Actions</th></tr></thead>
        <tbody>
          {candidates.length===0 && (<tr><td colSpan={4} className="text-gray-500 p-3">No candidates yet. Click Run.</td></tr>)}
          {candidates.map(c=>(
            <tr key={c.url} className="bg-white rounded-xl">
              <td className="p-2 align-top whitespace-nowrap text-sm text-gray-700">{c.domain}</td>
              <td className="p-2 align-top text-sm text-gray-700">{c.title||""}</td>
              <td className="p-2 align-top text-sm break-all"><a className="text-indigo-700 underline" href={c.url} target="_blank" rel="noreferrer">{c.url}</a></td>
              <td className="p-2 align-top"><div className="flex gap-2">
                <Button variant="ghost" onClick={()=>setPrimary(c)}>Set Primary</Button>
                <Button variant="ghost" onClick={()=>setSecondary(c)}>Set Secondary</Button></div></td>
            </tr>))}
        </tbody></table></div>
    </Section>
    <div className="text-xs text-gray-500">Backend Base URL: <code>{baseUrl}</code>. If you see CORS/SSL issues, switch to <code>http://127.0.0.1:8000</code>.</div>
  </div></div>);
}
