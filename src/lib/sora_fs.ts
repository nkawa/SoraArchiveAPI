import fs from "fs/promises";
import fscore from "fs";
import path from "path";

export const SORA_ROOT = process.env.SORA_VIDEO_ROOT || "/mnt/data/sora_video";

export type ReportJson = {
  filename: string; format: string; session_id: string; channel_id: string;
  recording_id: string; created_at: number; expire_time: number; expired_at: number;
  group_id: string; start_timestamp: string; stop_timestamp: string;
  file_path: string; split_duration: number; split_only: boolean; file_written: boolean;
  archives: Array<{ connection_id: string; label: string; node_name: string; bundle_id: string; client_id: string; start_time_offset: number; start_timestamp: string; split_last_index?: string; stop_time_offset: number; stop_timestamp: string }>
  failed_archives: unknown[]
};

export type PartJson = {
  start_timestamp: string; video_width: number; filename: string; split_index: string;
  node_name: string; connection_id: string; start_time: number; video_codec_type: string;
  file_path: string; video_height: number; expired_at: number; split_only: boolean; expire_time: number;
  format: string; metadata_file_path: string; recording_id: string; size: number; channel_id: string; session_id: string; video: boolean; stop_time: number; group_id: string; label: string; audio: boolean; metadata_filename: string; bundle_id: string; stop_timestamp: string; start_time_offset: number; client_id: string; stop_time_offset: number; video_bit_rate?: number;
};

export type RecordingSummary = {
  recordingId: string;
  dirName: string;
  channelId?: string;
  sessionId?: string;
  startTimestamp?: string;
  stopTimestamp?: string;
  parts: number;
  totalSizeBytes: number;
};

export function safeParseJSON<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function listRecordingDirs(): Promise<string[]> {
  const items = await fs.readdir(SORA_ROOT, { withFileTypes: true });
  return items.filter(d => d.isDirectory()).map(d => d.name).sort();
}

export async function loadReport(dirName: string): Promise<ReportJson | null> {
  const p = path.join(SORA_ROOT, dirName);
  const entries = await fs.readdir(p);
  const reportFile = entries.find(f => f.startsWith("report-") && f.endsWith(".json"));
  if (!reportFile) return null;
  const raw = await fs.readFile(path.join(p, reportFile), "utf8");
  return safeParseJSON<ReportJson>(raw);
}

export async function loadParts(dirName: string): Promise<PartJson[]> {
  const p = path.join(SORA_ROOT, dirName);
  const entries = await fs.readdir(p);
  const jsons = entries.filter(f => f.startsWith("split-archive-") && f.endsWith(".json"));
  const parts: PartJson[] = [];
  for (const jf of jsons) {
    const raw = await fs.readFile(path.join(p, jf), "utf8");
    const parsed = safeParseJSON<PartJson>(raw);
    if (parsed) parts.push(parsed);
  }
  // sort by numeric split_index ("0001" → 1)
  parts.sort((a, b) => parseInt(a.split_index, 10) - parseInt(b.split_index, 10));
  return parts;
}

export async function summarizeRecording(dirName: string): Promise<RecordingSummary> {
  const [report, parts] = await Promise.all([loadReport(dirName), loadParts(dirName)]);
  const totalSizeBytes = parts.reduce((s, p) => s + (p.size || 0), 0);
  return {
    recordingId: report?.recording_id || dirName,
    dirName,
    channelId: report?.channel_id,
    sessionId: report?.session_id,
    startTimestamp: report?.start_timestamp,
    stopTimestamp: report?.stop_timestamp,
    parts: parts.length,
    totalSizeBytes,
  };
}

export function resolvePartVideoPath(part: PartJson, dirName: string): string {
  // Prefer absolute file_path if present; fallback to join
  if (part.file_path && part.file_path.startsWith("/")) return part.file_path;
  return path.join(SORA_ROOT, dirName, path.basename(part.filename));
}

export function openRangeStream(absPath: string, range?: string) {
  const stat = fscore.statSync(absPath);
  const fileSize = stat.size;

  if (!range) {
    return {
      start: 0,
      end: fileSize - 1,
      size: fileSize,
      stream: fscore.createReadStream(absPath),
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      } as Record<string, string>,
      status: 200,
    };
  }

  // Range: bytes=start-end
  const m = /bytes=(\d+)-(\d+)?/.exec(range);
  const start = m ? parseInt(m[1], 10) : 0;
  const end = m && m[2] ? Math.min(parseInt(m[2], 10), fileSize - 1) : fileSize - 1;
  const chunkSize = end - start + 1;

  return {
    start, end, size: fileSize,
    stream: fscore.createReadStream(absPath, { start, end }),
    headers: {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize.toString(),
      "Content-Type": "video/mp4",
    } as Record<string, string>,
    status: 206,
  };
}