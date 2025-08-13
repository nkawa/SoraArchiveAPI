// /api/recordings/[id]/parts/[index]/video-low
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadParts, resolvePartVideoPath } from "@/lib/sora_fs";
import { spawn } from "child_process";

/**
 * 指定パートを低解像度にエンコードして返す
 * 例: 640x360 / CRF 28 / MP4 (H.264)
 */
export async function GET(_req: Request, context: { params: Promise<{ id: string; index: string }> }) {
  try {
    const { id, index } = await context.params;
    const parts = await loadParts(id);
    const part = parts.find(p => p.split_index === index);
    if (!part) {
      return NextResponse.json({ ok: false, error: "part not found" }, { status: 404 });
    }

    const inputPath = resolvePartVideoPath(part, id);

    const cropFilter = "crop=1920:1080:0:420,scale=640:360";

    // ffmpeg コマンド生成（低解像度・軽量エンコード）
    const ffmpegArgs = [
      "-i", inputPath,
      "-vf", cropFilter, // 低解像度に縮小
      "-c:v", "libx264",      // H.264 エンコード
      "-preset", "ultrafast", // エンコード速度優先
      "-crf", "28",           // 品質・圧縮率（値大＝低品質＆軽量）
      "-movflags", "frag_keyframe+empty_moov", // ストリーミング対応
      "-an",                  // 音声なし（必要なら削除）
      "-f", "mp4",            // 出力フォーマット
      "pipe:1"                // stdout に出力
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    // 標準エラーをログに（デバッグ用）
    ffmpeg.stderr.on("data", (data) => {
      console.error(`[ffmpeg ${id}_${index}] ${data}`);
    });

    // クライアント切断時に ffmpeg 停止
    // Next.js の Request では nodejs runtime で controller.signal が AbortSignal
    const abortSignal = (req as any).signal as AbortSignal | undefined;
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        console.log(`Client aborted: killing ffmpeg for ${id}_${index}`);
        ffmpeg.kill("SIGTERM");
      });
    }

    return new Response(ffmpeg.stdout as any, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Transfer-Encoding": "chunked",
        "Accept-Ranges": "none" // Range未対応
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

