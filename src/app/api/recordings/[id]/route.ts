export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadReport, loadParts } from "@/lib/sora_fs";

export async function GET(_req: Request,ctx: { params: Promise<{ id: string }> }) {
  try {
    const {id} = await ctx.params;
    const [report, parts] = await Promise.all([loadReport(id), loadParts(id)]);
    if (!report && parts.length === 0) {
      return NextResponse.json({ ok: false, error: "recording not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, report, parts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

