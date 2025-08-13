export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { listRecordingDirs, summarizeRecording } from "@/lib/sora_fs";

export async function GET() {
  try {
    const dirs = await listRecordingDirs();
    const summaries = await Promise.all(dirs.map(summarizeRecording));
    return NextResponse.json({ ok: true, items: summaries });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
