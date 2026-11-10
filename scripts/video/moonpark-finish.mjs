import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { basename } from "node:path";
function run(args, capture = false) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", ...args],
    { encoding: "utf8", stdio: capture ? "pipe" : "inherit" },
  );
  if (r.status) throw Error(r.stderr || "FFmpeg failed");
  return r.stdout;
}
await mkdir("public/video", { recursive: true });
const verifyOnly = process.argv.includes("--verify-only");
const delivery = verifyOnly
  ? "public/video"
  : await mkdtemp("outputs/moonpark-cinema/delivery-");
const desktop = `${delivery}/moonpark-opening-v5.mp4`,
  mobile = `${delivery}/moonpark-opening-v5-mobile.mp4`;
if (!verifyOnly) {
  run([
    "-i",
    "outputs/moonpark-cinema/picture-master.mp4",
    "-i",
    "outputs/moonpark-cinema/score-master.wav",
    "-i",
    "public/art/near-protocol-film-v1.svg",
    "-filter_complex",
    "[2:v]scale=360:-1[brand];[0:v][brand]overlay=(W-w)/2:H*0.075:format=auto[branded]",
    "-map",
    "[branded]",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-threads",
    "4",
    "-preset",
    "slow",
    "-crf",
    "22",
    "-maxrate",
    "3500k",
    "-bufsize",
    "7000k",
    "-pix_fmt",
    "yuv420p",
    "-af",
    "loudnorm=I=-18:TP=-1.5:LRA=10",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "48000",
    "-t",
    "40",
    "-movflags",
    "+faststart",
    desktop,
  ]);
  run([
    "-i",
    "outputs/moonpark-cinema/picture-mobile-master.mp4",
    "-i",
    desktop,
    "-i",
    "public/art/near-protocol-film-v1.svg",
    "-filter_complex",
    "[2:v]scale=300:-1[brand];[0:v][brand]overlay=(W-w)/2:H*0.075:format=auto[branded]",
    "-map",
    "[branded]",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-threads",
    "4",
    "-preset",
    "slow",
    "-crf",
    "23",
    "-maxrate",
    "1800k",
    "-bufsize",
    "3600k",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    mobile,
  ]);
}
if (!verifyOnly)
  run([
    "-ss",
    "38",
    "-i",
    desktop,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    `${delivery}/moonpark-opening-v5-poster.jpg`,
  ]);
const variants = [];
for (const [file, width, height] of [
  [desktop, 1920, 1080],
  [mobile, 720, 1280],
]) {
  const p = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    { encoding: "utf8" },
  );
  if (p.status) throw Error(p.stderr);
  const data = JSON.parse(p.stdout),
    v = data.streams.find((s) => s.codec_type === "video"),
    a = data.streams.find((s) => s.codec_type === "audio");
  assert.equal(v.width, width);
  assert.equal(v.height, height);
  assert.equal(v.r_frame_rate, "30/1");
  assert.equal(Number(v.nb_frames), 1200);
  assert.equal(Number(data.format.duration), 40);
  assert.equal(a.channels, 2);
  assert.equal(a.sample_rate, "48000");
  run(["-i", file, "-f", "null", "-"]);
  const bytes = await readFile(file);
  variants.push({
    file: `/video/${basename(file)}`,
    width,
    height,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
if (!verifyOnly) {
  await writeFile(
    `${delivery}/moonpark-opening.json`,
    JSON.stringify(
      {
        version: 5,
        duration: 40,
        fps: 30,
        frames: 1200,
        narration: {
          model: "Kokoro 82M v1.0",
          voice: "bm_george",
          license: "Apache-2.0",
          source: "https://huggingface.co/hexgrad/Kokoro-82M",
        },
        score: "Original Moonpark score and synthesized effects",
        cameraSource: "lib/moon/cinema.ts",
        sceneSource: "lib/moon/world.ts",
        brandSource: "public/art/near-protocol-film-v1.svg",
        variants,
      },
      null,
      2,
    ),
  );
  // Publish complete, decoded assets atomically after all variants pass verification.
  for (const file of [
    desktop,
    mobile,
    `${delivery}/moonpark-opening-v5-poster.jpg`,
    `${delivery}/moonpark-opening.json`,
  ]) {
    await rename(file, `public/video/${basename(file)}`);
  }
}
console.log(
  JSON.stringify({ verified: true, duration: 40, frames: 1200, variants }),
);
