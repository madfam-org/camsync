// Takes: measurements are read from the file, and warnings say what went wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseRate, measurementsFromProbe, takeDir, listTakes } from '../takes.mjs';

// The shape ffprobe printed for a real 4K vertical master on 2026-11-24 (values trimmed).
const probe4k = {
  streams: [
    { codec_type: 'video', codec_name: 'h264', profile: 'Constrained Baseline', width: 3840, height: 2160,
      avg_frame_rate: '72600/2419', r_frame_rate: '30/1', bit_rate: '28266545',
      side_data_list: [{ side_data_type: 'Display Matrix', rotation: -90 }] },
    { codec_type: 'audio', codec_name: 'aac', sample_rate: '48000', channels: 2 },
  ],
  format: { duration: '8.150000', size: '28800000' },
};

test('parseRate reads fractions and refuses empty ones', () => {
  assert.equal(parseRate('30/1'), 30);
  assert.equal(parseRate('30000/1001'), 29.97);
  assert.equal(parseRate('0/0'), null);
  assert.equal(parseRate(undefined), null);
});

test('a rotated master is reported upright, as a player shows it', () => {
  const m = measurementsFromProbe(probe4k, { meanDb: -64.9, maxDb: -37.8 }, { targetFps: 30 });
  assert.equal(m.video.width, 2160);
  assert.equal(m.video.height, 3840);
  assert.equal(m.video.storedWidth, 3840);
  assert.equal(m.orientation, 'vertical');
  assert.equal(m.video.fps, 30.01);
  assert.equal(m.duration, 8.15);
  assert.deepEqual(m.warnings, []);
});

test('a silent track and a slow frame rate are warnings', () => {
  const slow = structuredClone(probe4k);
  slow.streams[0].avg_frame_rate = '16/1';
  const m = measurementsFromProbe(slow, { meanDb: -91, maxDb: -91 }, { targetFps: 30 });
  assert.ok(m.warnings.includes('sound track is silent'));
  assert.ok(m.warnings.some((w) => w.startsWith('frame rate 16 is below')));
});

test('a missing track is a warning, not a crash', () => {
  const m = measurementsFromProbe({ streams: [], format: {} });
  assert.deepEqual(m.warnings, ['no video track', 'no sound track']);
  assert.equal(m.video, null);
  assert.equal(m.orientation, null);
});

test('take names cannot leave the takes folder', () => {
  assert.throws(() => takeDir('/tmp/x', '../etc'));
  assert.throws(() => takeDir('/tmp/x', 'a/b'));
  assert.equal(takeDir('/tmp/x', 'iphone-20261124-212837'), path.join('/tmp/x', 'iphone-20261124-212837'));
});

test('listTakes returns take folders with their measurements, newest first', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'camsync-takes-'));
  try {
    fs.mkdirSync(path.join(dir, 'a'));
    fs.writeFileSync(path.join(dir, 'a', 'master.mp4'), 'x');
    fs.mkdirSync(path.join(dir, 'b'));
    fs.writeFileSync(path.join(dir, 'b', 'master.mp4'), 'yy');
    fs.writeFileSync(path.join(dir, 'b', 'take.json'), JSON.stringify({ name: 'b', warnings: [] }));
    fs.mkdirSync(path.join(dir, 'empty'));
    fs.writeFileSync(path.join(dir, 'stray.mp4'), 'z');
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(path.join(dir, 'a', 'master.mp4'), past, past);
    const takes = listTakes(dir);
    assert.deepEqual(takes.map((t) => t.name), ['b', 'a']);
    assert.equal(takes[0].take.name, 'b');
    assert.equal(takes[1].take, null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
