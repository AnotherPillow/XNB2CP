/**
 * @type {Map<string, File>} NON XNB LOWERCASE path -> File
 */
const CONTENT_FOLDER = new Map()

/**
 * @typedef {Object} XNBAsset
 * @property {string} type - c# type of file
 * @property {Blob}  content
 */

/**
 * @typedef {Object} UnpackedXNB
 * @property {XNBAsset} file - The unpacked file as a Blob.
 * @property {string} target - The target path for the file.
 * @property {string} asset - The asset path, typically with a .png extension.
 */

/**
 * 
 * @param {HTMLImageElement img}
 * @returns {ImageData}
 */
function imgToImageData(img) {
    /**
     * @type {CanvasRenderingContext2D}
     */
    const ctx = img_diff_canvas.getContext('2d')
    img_diff_canvas.width = img.width;
    img_diff_canvas.height = img.height; 
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}

class DebugPixelBuffer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buffer = new Uint8ClampedArray(width * height * 4);
        // Initialize to transparent
        for (let i = 0; i < this.buffer.length; i += 4) {
            this.buffer[i + 3] = 0;
        }
    }

    draw(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                callback(x, y, (r, g, b, a = 255) => {
                    const idx = (y * this.width + x) * 4;
                    this.buffer[idx + 0] = r;
                    this.buffer[idx + 1] = g;
                    this.buffer[idx + 2] = b;
                    this.buffer[idx + 3] = a;
                });
            }
        }
    }

    toImage() {
        // Create an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(this.width, this.height);
        imageData.data.set(this.buffer);
        ctx.putImageData(imageData, 0, 0);

        // Create an HTMLImageElement from the canvas data URL
        const img = new Image();
        img.width = this.width;
        img.height = this.height;
        img.src = canvas.toDataURL();
        return img;
    }
}

// Create worker for image diffing
const diffWorker = new Worker('src/differ-worker.js');

/**
 * 
 * @param {HTMLImageElement} a 
 * @param {HTMLImageElement} b 
 * @returns {Promise<{x: number, y: number, w: number, h: number}[]>} array of rectangles of difference
 */
function diffImages(a, b) {
    return new Promise((resolve) => {
        const dataA = imgToImageData(a);
        const dataB = imgToImageData(b);
        
        const messageId = Date.now() + Math.random();
        
        const handleMessage = (event) => {
            if (event.data.id === messageId) {
                console.log('received ' + messageId + ' from worker')
                diffWorker.removeEventListener('message', handleMessage);
                
                const diffPixels = event.data.diffPixels;
                
                const pb = new DebugPixelBuffer(a.width, a.height);
                
                pb.draw((x, y, setPixel) => {
                    if (diffPixels.includes(`${x & ~0xF},${y & ~0xF}`)) setPixel(255, 0, 0, 255)
                });

                document.body.appendChild(pb.toImage(img_diff_canvas));
                resolve([]);
            }
        };
        
        diffWorker.addEventListener('message', handleMessage);
        
        console.log('posting ' + messageId + ' to worker')
        diffWorker.postMessage({
            id: messageId,
            imageDataA: dataA,
            imageDataB: dataB,
            width: a.width,
            height: a.height
        });
    });
}

/**
 * @param {UnpackedXNB} xnb 
 */
async function generateChange(xnb) {
    if (xnb.file.type == 'Texture2D') { // image
        const xnbFileImage = await blobToImage(xnb.file.content)
        
        const target_clean = cleanXnbPath(xnb.target)
        
        const sourceFile = CONTENT_FOLDER.get(target_clean)
            
        if (sourceFile) {
            const sourceFileImage = await blobToImage(sourceFile)
            if (sourceFileImage.width == xnbFileImage.width
                && sourceFileImage.height == xnbFileImage.height
            ) {
                await diffImages(sourceFileImage, xnbFileImage)
            }
        }
    }

    if (xnb.file.type.startsWith('StardewValley')) { // jsonish
        const xnbFileContent = await blobToString(xnb.file.content)
        // document.body.appendChild(xnbFileContent.sub())
    }

    return {
        "Action": "Load",
        "Target": xnb.target,
        "FromFile": xnb.asset
    }
}