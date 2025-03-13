"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = require("@ffmpeg-installer/ffmpeg");
const ffprobe_1 = require("@ffprobe-installer/ffprobe");
const cliProgress = __importStar(require("cli-progress"));
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.path);
fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.path);
const convertVideo = async (videoPath, outputPath, options = { finalWidth: 1080, finalHeight: 1920 }) => {
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
        (0, fluent_ffmpeg_1.default)()
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
const getMetadata = async (videoPath) => {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(videoPath, (err, metadata) => {
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
module.exports = { convertVideo, getMetadata };
