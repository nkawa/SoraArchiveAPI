export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { SORA_ROOT } from "@/lib/sora_fs";
import path from "path"; // ← 追加

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const {id} = await ctx.params
    // かんたんな入力バリデーション（ディレクトリトラバーサル対策）
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const dir = path.join(SORA_ROOT, id);

    // ディレクトリが存在するか確認
    try {
      const st = await fs.stat(dir);
      if (!st.isDirectory()) {
        return NextResponse.json({ ok: false, error: "not a directory" }, { status: 404 });
      }
    } catch (e: any) {
      if (e?.code === "ENOENT") {
        return NextResponse.json({ ok: false, error: "recording not found" }, { status: 404 });
      }
      throw e;
    }

    const files = await fs.readdir(dir);
    files.sort();
    return NextResponse.json({ ok: true, files });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
