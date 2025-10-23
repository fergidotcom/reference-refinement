import React from "react";
export function Section({title,right,children}:{title:string;right?:React.ReactNode;children:React.ReactNode}) {
  return (<div className="bg-white rounded-2xl shadow p-5 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>{children}
  </div>);
}
