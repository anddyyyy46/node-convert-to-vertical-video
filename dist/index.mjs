import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import * as cliProgress from "cli-progress";
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
export const convertVideo = async (videoPath, outputPath, options = { finalWidth: 1080, finalHeight: 1920 }) => {
    return new Promise(async (resolve, reject) => {
        const videoMetadata = (await getMetadata(videoPath));
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
        let totalTime;
        let percentage = 0;
        const bar = new cliProgress.SingleBar({
            format: "{bar} | {percentage}%",
        }, cliProgress.Presets.shades_classic);
        ffmpeg()
            .input(videoPath)
            .complexFilter(convertFilter, finalOutputVar)
            .output(outputPath)
            .outputOptions(["-map 0:a"])
            .on("error", (err) => {
            reject(err);
        })
            .on("codecData", (data) => {
            bar.start(100, 0);
            totalTime = parseInt(data.duration.replace(/:/g, ""));
        })
            .on("progress", (progress) => {
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
export const getMetadata = async (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const stream = metadata.streams.find((s) => s.codec_type === "video");
            if (stream) {
                return resolve({
                    width: stream.width,
                    height: stream.height,
                });
            }
            else {
                return reject(new Error("No Videostreams found!"));
            }
        });
        return new Error("Couldn't get metadata");
    });
};
