export const runtime = "nodejs";
import { NextResponse } from "next/server";
import path from "path";
import { loadParts, resolvePartVideoPath, openRangeStream } from "@/lib/sora_fs";

export async function GET(req: Request, { params }: { params: { id: string; index: string } }) {
  try {
    const { id, index } = params; // index like "0001"
    const parts = await loadParts(id);
    const part = parts.find(p => p.split_index === index);
    if (!part) {
      return NextResponse.json({ ok: false, error: "part not found" }, { status: 404 });
    }

    const abs = resolvePartVideoPath(part, id);
    const range = req.headers.get("range") || undefined;
    const { stream, headers, status } = openRangeStream(abs, range);

    return new Response(stream as any, { status, headers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
