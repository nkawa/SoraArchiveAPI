// /api/recordings/[id]/parts  ← パート番号の一覧を返す
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadParts } from "@/lib/sora_fs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parts = await loadParts(id); // split_index 昇順に並んで返る（lib側で sort 済）

    if (parts.length === 0) {
      return NextResponse.json({ ok: false, error: "no parts found" }, { status: 404 });
    }

    const origin = new URL(req.url).origin;

    // 必要そうなメタだけに絞り込む（UI から使いやすい構造）
    const items = parts.map(p => ({
      index: p.split_index,                       // 例: "0001"
      sizeBytes: p.size ?? 0,
      width: p.video_width,
      height: p.video_height,
      codec: p.video_codec_type,                  // 例: "VP9"
      start_timestamp: p.start_timestamp,         // ISO8601
      stop_timestamp: p.stop_timestamp,           // ISO8601
      // 直接再生/ダウンロード用の動画URL（Range対応の既存エンドポイント）
      video_url: `${origin}/api/recordings/${id}/parts/${p.split_index}/video`,
      // メタJSONへの絶対パスが必要なら（任意）
      metadata_filename: p.metadata_filename,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

