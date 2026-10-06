# Sample media

Original test media for Media player stories, documentation examples and verification
fixtures. Every file here was generated for this repository with FFmpeg's synthetic
sources (`testsrc2`, `sine`, `aevalsrc`), `rsvg-convert` and hand-written WebVTT. It
contains no third-party footage, music, artwork or captions and is freely usable,
without attribution, inside and outside this project.

| File               | Content                                                                                                                                                | Duration / size   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `sample-video.mp4` | H.264 High 1280×720 24 fps + AAC-LC mono 48 kHz; `testsrc2` with a large timecode, 440 Hz tone that beeps every second; keyframe every 2 s, fast start | 24.000 s, 1.38 MB |
| `sample-audio.m4a` | AAC-LC mono 48 kHz, linear sine sweep 220 → 880 Hz                                                                                                     | 24.000 s, 295 kB  |
| `poster.jpg`       | 1280×720 frame at 00:02.0                                                                                                                              | 44 kB             |
| `thumbnails.jpg`   | 640×270 sprite, 4×3 cells of 160×90, one frame every 2 s (00:00 … 00:22)                                                                               | 32 kB             |
| `thumbnails.vtt`   | 12 cues, `thumbnails.jpg#xywh=x,y,160,90`                                                                                                              | 0–24 s            |
| `captions-en.vtt`  | English captions, 6 cues                                                                                                                               | 0.5–23.5 s        |
| `captions-es.vtt`  | Spanish captions, 6 cues                                                                                                                               | 0.5–23.5 s        |
| `chapters.vtt`     | 4 contiguous chapters of 6 s                                                                                                                           | 0–24 s            |

The timecode in the video reads `MM:SS.t` and matches the playback position, so seeking,
thumbnail selection and caption timing can be checked by eye.

A multi-audio variant (two AAC tracks) is not provided: `HTMLMediaElement.audioTracks`
is only enabled by default in Safari, so Chrome and Firefox expose a single track.

## Regenerating

Requirements: FFmpeg 8 with `libx264`, `rsvg-convert` (librsvg) and Python 3. Commands
run from this folder; `tc/` is a temporary directory.

1. Timecode overlay frames (10 per second, 240 frames):

   ```sh
   mkdir -p tc
   python3 - <<'EOF'
   import subprocess
   for i in range(240):
       label = f"{i // 600:02d}:{(i // 10) % 60:02d}.{i % 10}"
       svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="150">'
              '<rect x="4" y="4" width="512" height="142" rx="18" fill="black" fill-opacity="0.72"/>'
              '<text x="260" y="112" text-anchor="middle" font-family="Menlo, monospace" '
              f'font-weight="bold" font-size="104" fill="white">{label}</text></svg>')
       open('tc/f.svg', 'w').write(svg)
       subprocess.run(['rsvg-convert', 'tc/f.svg', '-o', f'tc/{i:04d}.png'], check=True)
   EOF
   ```

2. Video:

   ```sh
   ffmpeg -f lavfi -i "testsrc2=size=1280x720:rate=24:duration=24" \
     -framerate 10 -i tc/%04d.png \
     -f lavfi -i "sine=frequency=440:beep_factor=4:sample_rate=48000:duration=24" \
     -filter_complex "[0:v][1:v]overlay=x=(W-w)/2:y=(H-h)/2:eof_action=repeat,format=yuv420p[v]" \
     -map "[v]" -map 2:a -c:v libx264 -preset slow -profile:v high -crf 30 \
     -maxrate 380k -bufsize 760k -g 48 -keyint_min 48 -sc_threshold 0 \
     -c:a aac -b:a 64k -ac 1 -t 24 -movflags +faststart \
     -metadata title="Tweakpad sample video" -metadata:s:a:0 language=eng sample-video.mp4
   ```

3. Audio sweep:

   ```sh
   ffmpeg -f lavfi -i "aevalsrc=0.4*sin(2*PI*(220*t+(880-220)/(2*24)*t*t)):s=48000:d=24" \
     -c:a aac -b:a 96k -ac 1 -movflags +faststart \
     -metadata title="Tweakpad sample audio" sample-audio.m4a
   ```

4. Poster and thumbnail sprite:

   ```sh
   ffmpeg -ss 2 -i sample-video.mp4 -frames:v 1 -q:v 4 poster.jpg
   ffmpeg -i sample-video.mp4 -vf "select='not(mod(n\,48))',scale=160:90,tile=4x3" \
     -fps_mode passthrough -frames:v 1 -q:v 5 thumbnails.jpg
   ```

5. The WebVTT files are plain text written by hand (`thumbnails.vtt` cue _n_ covers
   `2n … 2n+2` s and selects cell `x = (n mod 4)·160`, `y = ⌊n / 4⌋·90`).

Verify with `ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact <file>`.
