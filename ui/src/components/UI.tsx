import React from "react";
export function Input(p:{value:string;onChange:(v:string)=>void;placeholder?:string;type?:string}) {
  return <input type={p.type||"text"} className="w-full rounded-2xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
    value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder}/>;
}
export function Textarea(p:{value:string;onChange:(v:string)=>void;rows?:number;placeholder?:string}) {
  return <textarea className="w-full rounded-2xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
    value={p.value} onChange={e=>p.onChange(e.target.value)} rows={p.rows||4} placeholder={p.placeholder}/>;
}
export function Button({children,onClick,variant="primary",disabled}:{children:React.ReactNode;onClick:()=>void;variant?:"primary"|"ghost"|"danger"|"dark";disabled?:boolean}) {
  const base="px-4 py-2 rounded-2xl font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const v = variant==="primary"?"bg-indigo-600 hover:bg-indigo-700 text-white":
           variant==="ghost"  ?"bg-white hover:bg-gray-50 border border-gray-300":
           variant==="danger" ?"bg-rose-600 hover:bg-rose-700 text-white":
                               "bg-gray-800 hover:bg-black text-white";
  return <button className={`${base} ${v}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
export function Copyable({label,text}:{label?:string;text:string}) {
  const [copied,setCopied]=React.useState(false);
  return <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600 select-all break-all">{label?<b>{label}: </b>:null}{text}</span>
    <Button variant="ghost" onClick={async()=>{await navigator.clipboard.writeText(text||"");setCopied(true);setTimeout(()=>setCopied(false),1200);}}>Copy</Button>
    {copied && <span className="text-xs text-green-700">Copied</span>}
  </div>;
}
