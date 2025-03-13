### Node-convert-to-vertical-video
Small library to convert a 16:9 video to a vertical 9:16 video with ffmpeg

## Example
```javascript
// main.js
import { convertVideo } from "convert-to-vertical-video";

const main = async () => {
    await convertVideo("input.mp4", "output.mp4")
}

main()
```