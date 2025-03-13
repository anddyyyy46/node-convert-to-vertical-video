import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import * as cliProgress from "cli-progress";
import type { Metadata } from "./types.ts";

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export const convertVideo = async (
  videoPath: string,
  outputPath: string,
  options = { finalWidth: 1080, finalHeight: 1920 }
) => {
  return new Promise<void | Error>(async (resolve, reject) => {
    const videoMetadata = (await getMetadata(videoPath)) as Metadata;
    const scaledWidth = (videoMetadata.width * 16) / 9;
    const scaledHeight = (videoMetadata.height * 16) / 9;

    const finalOutputVar = "v";
    const convertFilter = [
      {
        filter: "pad",
        options: {
          w: scaledWidth,
          h: scaledHeight,
          x: 0,
          y: 0,
        },
        inputs: "[0:v]",
        outputs: "paddedVid",
      },
      {
        filter: "scale",
        options: { w: scaledWidth, h: scaledHeight },
        inputs: "[0:v]",
        outputs: "scaledVid",
      },
      {
        filter: "overlay",
        options: { x: 0, y: 0 },
        inputs: ["paddedVid", "scaledVid"],
        outputs: "combined",
      },
      {
        filter: "crop",
        options: { x: `iw/2-${options.finalWidth}/2`, y: 0, w: 1080 },
        inputs: "combined",
        outputs: finalOutputVar,
      },
    ];

    let totalTime: number;
    let percentage = 0;
    const bar = new cliProgress.SingleBar(
      {
        format: "{bar} | {percentage}%",
      },
      cliProgress.Presets.shades_classic
    );
    ffmpeg()
      .input(videoPath as string)
      .complexFilter(convertFilter, finalOutputVar)
      .output(outputPath as string)
      .outputOptions(["-map 0:a"])
      .on("error", (err: any) => {
        reject(err);
      })
      .on("codecData", (data: { duration: string }) => {
        bar.start(100, 0);
        totalTime = parseInt(data.duration.replace(/:/g, ""));
      })
      .on("progress", (progress: { timemark: string }) => {
        const time = parseInt(progress.timemark.replace(/:/g, ""));
        const oldPercent = percentage;
        percentage = Math.floor((time / totalTime) * 100);
        if (oldPercent !== percentage) {
          bar.update(percentage);
        }
      })
      .on("end", () => {
        bar.stop();
        resolve();
      })
      .run();
  });
};

export const getMetadata = async (videoPath: string): Promise<Error | Metadata> => {
  return new Promise((resolve, reject): Error | Metadata => {
    ffmpeg.ffprobe(videoPath, (err: string, metadata) => {
      if (err) {
        return reject(err);
      }
      const stream = metadata.streams.find((s) => s.codec_type === "video");
      if (stream) {
        return resolve({
          width: stream.width as number,
          height: stream.height as number,
        });
      } else {
        return reject(new Error("No Videostreams found!"));
      }
    });
    return new Error("Couldn't get metadata");
  });
};
