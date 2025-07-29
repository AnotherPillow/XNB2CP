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
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(this.width, this.height);
        imageData.data.set(this.buffer);
        ctx.putImageData(imageData, 0, 0);

        const img = new Image();
        img.width = this.width;
        img.height = this.height;
        img.src = canvas.toDataURL();
        return img;
    }
}

/**
 * @param {number[]} sections 
 * @returns {{x: number, y: number, w: number, h: number}[]} array of rectangles
 */
function generateBiggestPossibleRectangles(sections) {
    const possibleTiles = new Set(sections);
    const coveredTiles = new Set();
    const xys = sections.map(n => unpack12x2(n));
    
    if (xys.length === 0) return [];
    
    const ret = [];
    
    for (const [fx, fy] of xys) {
        const packedStart = pack12x2(fx, fy);
        if (coveredTiles.has(packedStart)) continue;
        
        let maxWidth = 0;
        for (let x = 0; x < 16 * 8; x += 16) {
            if (!possibleTiles.has(pack12x2(fx + x, fy)) || 
                coveredTiles.has(pack12x2(fx + x, fy))) {
                break;
            }
            maxWidth = x + 16;
        }
        
        if (maxWidth === 0) continue;
        
        let maxHeight = 0;
        heightLoop: for (let y = 0; y < 16 * 8; y += 16) {
            for (let x = 0; x < maxWidth; x += 16) {
                const packed = pack12x2(fx + x, fy + y);
                if (!possibleTiles.has(packed) || coveredTiles.has(packed)) {
                    break heightLoop;
                }
            }
            maxHeight = y + 16;
        }
        
        if (maxHeight === 0) continue;
        
        for (let y = 0; y < maxHeight; y += 16) {
            for (let x = 0; x < maxWidth; x += 16) {
                coveredTiles.add(pack12x2(fx + x, fy + y));
            }
        }
        
        ret.push({
            x: fx,
            y: fy,
            width: maxWidth,
            height: maxHeight,
        });
    }
    
    return ret;
}
/**
 * 
 * @param {HTMLImageElement} a 
 * @param {HTMLImageElement} b 
 * @param {string?} fn 
 * @returns {Promise<{x: number, y: number, w: number, h: number}[]>} array of rectangles of difference
 */
function diffImages(a, b, fn) {
    console.log('diffimages called')
    const dataA = imgToImageData(a);
    const dataB = imgToImageData(b);

    return new Promise((resolve) => {
        const go = new Go();
        try {
            WebAssembly.instantiateStreaming(fetch("/src/go/main.wasm"), go.importObject)
                .then((result) => {
                    go.run(result.instance);
                    
                    console.log("Go runtime started");
                    /**
                     * @type {Uint32Array}
                     * @description array of the {@link pack12x2}'s result from the top left 
                     */
                    const ov = go_diffImagesToOverlay(a.width, a.height, dataA.data, dataB.data)
                    console.log('differing pixels', ov.length)
                    // const pb = new DebugPixelBuffer(a.width, a.height);
                    
                    // // runs callback on every pixel
                    // pb.draw((x, y, setPixel) => {
                    //     if (ov.includes(pack12x2(x & ~0xF, y & ~0xF)))setPixel(255, 0, 0, 255)
                    // });

                    // const i = pb.toImage(img_diff_canvas)
                    // i.setAttribute('data-src-a', a.src)
                    // i.setAttribute('data-src-b', b.src)
                    // i.setAttribute('data-src-fn', fn)
                    // document.body.appendChild(i);

                    // const p = document.createElement('p')
                    const diffBigAreas = generateBiggestPossibleRectangles(Array.from(ov))
                    // p.innerHTML = `${fn}: \n${JSON.stringify(diffBigAreas, null, 4)}`
                    // document.body.appendChild(p);

                    resolve(diffBigAreas)
                })
                .catch((err) => console.error("WASM load error:", err));
        } catch (e) {
            console.error('failed on loading go', e)
        }
    })
}

/**
 * @param {UnpackedXNB} xnb 
 * @returns {Record<string, any>}
 */
async function generateChanges(xnb) {
    if (xnb.file.type == 'Texture2D') { // image
        const xnbFileImage = await blobToImage(xnb.file.content)
        
        const target_clean = cleanXnbPath(xnb.target)
        
        const sourceFile = CONTENT_FOLDER.get(target_clean)
            
        if (sourceFile) {
            const sourceFileImage = await blobToImage(sourceFile)
            if (sourceFileImage.width == xnbFileImage.width
                && sourceFileImage.height == xnbFileImage.height
            ) {
                console.log('calling diffimages on ', xnb.target, target_clean)
                /**
                 * @type {{x: number, y: number, w: number, h: number}[]}
                 */
                const diffedTiles = await diffImages(sourceFileImage, xnbFileImage, target_clean)
                // console.log('diffed tile section count: ', diffedTiles.length)
                // const pb = new DebugPixelBuffer(sourceFileImage.width, sourceFileImage.height)
                // /**
                //  * @type {Set<number>}
                //  */
                // const pixels = new Set()
                // /**
                //  * @type {Set<number>}
                //  */
                // const bpixels = new Set()

                // for (const { x, y, width: w, height: h } of diffedTiles) {
                //     for (let j = 0; j < h; j++) {
                //         for (let i = 0; i < w; i++) {
                //             bpixels.add(pack12x2(x + i, y + j)); // background color (dark gray)
                //         }
                //     }
                //     for (let i = 0; i < w; i++) {
                //         pixels.add(pack12x2(x + i, y)); // top
                //         pixels.add(pack12x2(x + i, y + h - 1)); // bottom
                //     }
                //     for (let j = 1; j < h - 1; j++) {
                //         pixels.add(pack12x2(x, y + j)); // left
                //         pixels.add(pack12x2(x + w - 1, y + j)); // right
                //     }
                // }

                // console.log('pixels to draw outline', Array.from(pixels.values()))

                // pb.draw((x, y, setPixel) => {
                //     if (bpixels.has(pack12x2(x, y))) setPixel(60, 60, 60, 100)
                //     if (pixels.has(pack12x2(x, y))) setPixel(100, 255, 100)
                // })

                // const i = pb.toImage(img_diff_canvas)
                // console.log('toimage result outlinehopefully', i)
                // document.body.appendChild(i)
                let changes = []

                for (const section of diffedTiles) {
                    changes.push({
                        Action: 'EditImage',
                        Target: xnb.target,
                        FromFile: xnb.asset,
                        FromArea: {
                            X: section.x,
                            Y: section.y,
                            Width: section.w,
                            Height: section.h
                        },
                        ToArea: {
                            X: section.x,
                            Y: section.y,
                            Width: section.w,
                            Height: section.h
                        },
                        PatchMode: 'Replace'
                    })
                }

                return changes;
            }
        }
    }

    if (xnb.file.type.startsWith('StardewValley')) { // jsonish
        const xnbFileContent = await blobToString(xnb.file.content)
        // document.body.appendChild(xnbFileContent.sub())
    }

    return [
        {
            "Action": "Load",
            "Target": xnb.target,
            "FromFile": xnb.asset
        }
    ]
}