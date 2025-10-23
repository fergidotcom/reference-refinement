// netlify/functions/resolve-urls.ts
export default async (req: Request) => {
  if (req.method !== "POST") return new Response("POST required", { status: 405 });
  const { urls = [] } = await req.json();
  const out:any[] = [];
  for (const input of urls) {
    try {
      const r = await fetch(input, { method: "HEAD", redirect: "follow" });
      const final = r.url;
      const type = (r.headers.get("content-type") || "").includes("pdf") || final.toLowerCase().endsWith(".pdf") ? "pdf" : "html";
      out.push({ input, final, type, status: r.status });
    } catch (e:any) {
      out.push({ input, error: String(e) });
    }
  }
  return new Response(JSON.stringify({ resolved: out }), { headers: { "content-type": "application/json" } });
};
