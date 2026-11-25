// @ts-check
/**
 * Takes: one folder per recording, holding the master and a measurements file.
 *
 * RFC 0073 §3.1: a take records what was actually captured, read from the file after the take,
 * never what was intended. A silent track or a frame rate below its target is written down as such.
 *
 *   <takes dir>/<take name>/master.mp4   (or .webm)
 *   <takes dir>/<take name>/take.json    measurements, written when the phone says the take is done
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export const TAKE_NAME = /^[\w-]{1,80}$/;
const SILENT_DB = -70;
const TOO_SLOW = 0.9;

/** @param {string} dir @param {string} name */
export function takeDir(dir, name) {
  if (!TAKE_NAME.test(name)) throw new Error('bad take name');
  return path.join(dir, name);
}

/** @param {string} dir @param {string} name @param {'mp4' | 'webm'} ext */
export function masterPath(dir, name, ext) {
  return path.join(takeDir(dir, name), `master.${ext}`);
}

/** "30000/1001" -> 29.97; "0/0" -> null */
export function parseRate(/** @type {string | undefined} */ rate) {
  if (!rate) return null;
  const [n, d] = rate.split('/').map(Number);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0 || n === 0) return null;
  return Math.round((n / d) * 100) / 100;
}

/**
 * Turns ffprobe's JSON and an optional loudness reading into the take's measurements.
 * Pure, so it is tested without a file or a probe.
 * @param {any} probe ffprobe -show_streams -show_format -print_format json
 * @param {{ meanDb?: number | null, maxDb?: number | null }} [loudness]
 * @param {{ targetFps?: number }} [target]
 */
export function measurementsFromProbe(probe, loudness = {}, target = {}) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  const rotation = Number(
    v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0,
  );
  const quarterTurn = Math.abs(rotation) % 180 === 90;
  const video = v
    ? {
        codec: v.codec_name ?? null,
        profile: v.profile ?? null,
        storedWidth: v.width ?? null,
        storedHeight: v.height ?? null,
        rotation,
        // What a player shows: the stored frame turned by the rotation flag.
        width: quarterTurn ? v.height ?? null : v.width ?? null,
        height: quarterTurn ? v.width ?? null : v.height ?? null,
        fps: parseRate(v.avg_frame_rate) ?? parseRate(v.r_frame_rate),
        bitRate: v.bit_rate ? Number(v.bit_rate) : null,
      }
    : null;
  const audio = a
    ? {
        codec: a.codec_name ?? null,
        sampleRate: a.sample_rate ? Number(a.sample_rate) : null,
        channels: a.channels ?? null,
        meanDb: loudness.meanDb ?? null,
        maxDb: loudness.maxDb ?? null,
      }
    : null;
  const duration = probe?.format?.duration ? Number(probe.format.duration) : null;
  const bytes = probe?.format?.size ? Number(probe.format.size) : null;

  /** @type {string[]} */
  const warnings = [];
  if (!video) warnings.push('no video track');
  if (!audio) warnings.push('no sound track');
  if (audio && audio.maxDb !== null && audio.maxDb <= SILENT_DB) warnings.push('sound track is silent');
  if (video?.fps && target.targetFps && video.fps < target.targetFps * TOO_SLOW) {
    warnings.push(`frame rate ${video.fps} is below the target ${target.targetFps}`);
  }
  return {
    orientation: video?.width && video?.height ? (video.height > video.width ? 'vertical' : 'horizontal') : null,
    duration,
    bytes,
    video,
    audio,
    warnings,
  };
}

/** @param {string} file @param {string[]} args @param {number} timeoutMs @returns {Promise<string>} */
function run(file, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(String(stdout) + String(stderr));
    });
  });
}

/** Reads the loudness of the first 30 s only, so a long take costs no more than a short one. */
async function loudnessOf(/** @type {string} */ file) {
  try {
    const out = await run(
      'ffmpeg',
      ['-hide_banner', '-nostats', '-t', '30', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
      60_000,
    );
    const mean = out.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/);
    const max = out.match(/max_volume:\s*(-?[\d.]+|-inf) dB/);
    const num = (/** @type {RegExpMatchArray | null} */ m) => (m ? (m[1] === '-inf' ? -200 : Number(m[1])) : null);
    return { meanDb: num(mean), maxDb: num(max) };
  } catch {
    return { meanDb: null, maxDb: null };
  }
}

/**
 * Measures a master and writes take.json beside it. Never throws: when the probe tools are missing or
 * fail, the take is still written, with the reason.
 * @param {string} dir @param {string} name @param {'mp4' | 'webm'} ext
 * @param {{ startedAt?: number, stoppedAt?: number, targetFps?: number, camera?: unknown }} info
 */
export async function finishTake(dir, name, ext, info = {}) {
  const file = masterPath(dir, name, ext);
  /** @type {any} */
  let measured;
  try {
    const probe = JSON.parse(
      await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], 30_000),
    );
    measured = measurementsFromProbe(probe, await loudnessOf(file), { targetFps: info.targetFps });
  } catch (e) {
    measured = { warnings: [`not measured: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const take = {
    name,
    master: path.basename(file),
    measuredAt: new Date().toISOString(),
    startedAt: info.startedAt ? new Date(info.startedAt).toISOString() : null,
    stoppedAt: info.stoppedAt ? new Date(info.stoppedAt).toISOString() : null,
    camera: info.camera ?? null,
    ...measured,
  };
  fs.writeFileSync(path.join(takeDir(dir, name), 'take.json'), JSON.stringify(take, null, 2) + '\n');
  return take;
}

/** The newest takes, with their measurements when they exist. */
export function listTakes(/** @type {string} */ dir, limit = 12) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const takes = [];
  for (const e of entries) {
    if (!e.isDirectory() || !TAKE_NAME.test(e.name)) continue;
    const folder = path.join(dir, e.name);
    const master = ['master.mp4', 'master.webm'].find((m) => fs.existsSync(path.join(folder, m)));
    if (!master) continue;
    const st = fs.statSync(path.join(folder, master));
    let take = null;
    try {
      take = JSON.parse(fs.readFileSync(path.join(folder, 'take.json'), 'utf8'));
    } catch {
      // still recording, or not yet measured
    }
    takes.push({ name: e.name, master, bytes: st.size, modified: st.mtimeMs, take });
  }
  return takes.sort((a, b) => b.modified - a.modified).slice(0, limit);
}
