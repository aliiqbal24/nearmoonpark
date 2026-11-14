import { spawnSync } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rename,
  access,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const SOURCE = "outputs/moonpark-cinema-v7";
const verifyOnly = process.argv.includes("--verify-only");
await mkdir("public/video", { recursive: true });
const delivery = verifyOnly
  ? "public/video"
  : await mkdtemp(`${SOURCE}/delivery-`);
const story = JSON.parse(
  await readFile("public/video/moonpark-opening-v7-story.json", "utf8"),
);
const font = resolve("public/fonts/ArchivoBlack-Regular.ttf");
function ffmpeg(args) {
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", ...args],
    { encoding: "utf8" },
  );
  if (result.status) throw Error(result.stderr || "FFmpeg failed");
}
const variants = [];
for (const portrait of [false, true]) {
  const name = `moonpark-opening-v7${portrait ? "-mobile" : ""}.mp4`;
  const file = `${delivery}/${name}`;
  const titleSize = portrait ? 66 : 136;
  const insert = `${SOURCE}/picture-insert-21-29-${portrait ? "mobile-" : ""}master.mp4`;
  const hasInsert = await access(insert).then(
    () => true,
    () => false,
  );
  const edit = hasInsert
    ? "[0:v]trim=end=21,setpts=PTS-STARTPTS[before];[3:v]setpts=PTS-STARTPTS[ride];[0:v]trim=start=29,setpts=PTS-STARTPTS[after];[before][ride][after]concat=n=3:v=1:a=0[cut];"
    : "";
  const graphic =
    edit +
    `[2:v]scale=${portrait ? 300 : 370}:-1[brand];[${hasInsert ? "cut" : "0:v"}][brand]overlay=(W-w)/2:H*0.12:enable='lt(t,4)+gte(t,33)',drawbox=x=0:y=0:w=iw:h=ih:color=black@0.22:t=fill:enable='gte(t,35.5)',drawtext=fontfile='${font}':text='MOONPARK':fontsize=${titleSize}:fontcolor=0xfff2d5:x=(w-tw)/2:y=h*0.42:shadowcolor=black@0.7:shadowx=0:shadowy=3:enable='gte(t,35.5)'[picture]`;
  if (!verifyOnly) {
    ffmpeg([
      "-i",
      `${SOURCE}/picture-${portrait ? "mobile-" : ""}master.mp4`,
      "-i",
      `${SOURCE}/score-master.wav`,
      "-i",
      "public/art/near-protocol-film-v1.svg",
      ...(hasInsert ? ["-i", insert] : []),
      "-filter_complex",
      graphic,
      "-map",
      "[picture]",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-threads",
      "4",
      "-preset",
      "slow",
      "-crf",
      portrait ? "21" : "20",
      "-maxrate",
      portrait ? "2600k" : "6500k",
      "-bufsize",
      portrait ? "5200k" : "13000k",
      "-profile:v",
      "high",
      "-level:v",
      "4.2",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "60",
      "-af",
      "loudnorm=I=-16:TP=-1.8:LRA=8",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-t",
      "40",
      "-metadata",
      "title=Moonpark — Opening the Moon",
      "-metadata",
      "comment=Helios by Scott Buckley, CC BY 4.0, www.scottbuckley.com.au. Edited excerpt with original effects and narration.",
      "-movflags",
      "+faststart",
      file,
    ]);
  }
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    { encoding: "utf8" },
  );
  if (probe.status) throw Error(probe.stderr);
  const data = JSON.parse(probe.stdout);
  const video = data.streams.find((s) => s.codec_type === "video");
  const audio = data.streams.find((s) => s.codec_type === "audio");
  assert.equal(video.width, portrait ? 720 : 1920);
  assert.equal(video.height, portrait ? 1280 : 1080);
  assert.equal(video.r_frame_rate, "60/1");
  assert.equal(+video.nb_frames, 2400);
  assert.equal(+data.format.duration, 40);
  assert.equal(audio.channels, 2);
  assert.equal(audio.sample_rate, "48000");
  ffmpeg(["-i", file, "-f", "null", "-"]);
  const bytes = await readFile(file);
  variants.push({
    file: `/video/${name}`,
    width: video.width,
    height: video.height,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
if (!verifyOnly) {
  ffmpeg([
    "-ss",
    "38",
    "-i",
    `${delivery}/moonpark-opening-v7.mp4`,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    `${delivery}/moonpark-opening-v7-poster.jpg`,
  ]);
  await writeFile(
    `${delivery}/moonpark-opening.json`,
    JSON.stringify(
      {
        version: 7,
        duration: 40,
        fps: 60,
        frames: 2400,
        narration: {
          model: "Kokoro 82M v1.0",
          voices: ["bm_fable", "am_michael"],
          license: "Apache-2.0",
        },
        music: story.music,
        effects: "Original layered stereo sound design",
        cameraSource: "lib/moon/cinema.ts",
        sceneSource: "lib/moon/world.ts",
        variants,
      },
      null,
      2,
    ) + "\n",
  );
  for (const name of [
    "moonpark-opening-v7.mp4",
    "moonpark-opening-v7-mobile.mp4",
    "moonpark-opening-v7-poster.jpg",
    "moonpark-opening.json",
  ])
    await rename(`${delivery}/${name}`, `public/video/${name}`);
}
console.log(
  JSON.stringify({ verified: true, duration: 40, frames: 2400, variants }),
);
