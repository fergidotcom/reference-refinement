import React from "react";
export function useDebounced<T>(value:T, ms:number){ const [v,setV]=React.useState(value);
  React.useEffect(()=>{ const t=setTimeout(()=>setV(value),ms); return ()=>clearTimeout(t); },[value,ms]); return v; }
