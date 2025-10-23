// netlify/functions/proxy-fetch.ts
export default async (req: Request) => {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });
  const method = (new URL(req.url).searchParams.get("method") || "GET").toUpperCase();
  const r = await fetch(url, { method, redirect: "follow" });
  const headers = new Headers(r.headers);
  headers.delete("set-cookie");
  return new Response(await r.arrayBuffer(), { status: r.status, headers });
};
