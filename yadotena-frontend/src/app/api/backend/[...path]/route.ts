import { NextRequest, NextResponse } from "next/server";
import { normalizeApiOrigin } from "@/lib/api-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_REQ = ["authorization", "accept", "content-type", "x-requested-with"];
const FORWARD_RES = ["content-type", "cache-control"];

async function proxy(req: NextRequest, path: string[]) {
  const origin = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL);
  const target = `${origin}/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQ) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }

  const method = req.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
  }

  const out = new Headers();
  for (const name of FORWARD_RES) {
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!path?.length) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  return proxy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
