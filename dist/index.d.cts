import type { Metadata } from "./types" with { "resolution-mode": "require" };
export type { Metadata };
export declare const convertVideo: (videoPath: string, outputPath: string, options?: {
    finalWidth: number;
    finalHeight: number;
}) => Promise<void | Error>;
export declare const getMetadata: (videoPath: string) => Promise<Error | Metadata>;
