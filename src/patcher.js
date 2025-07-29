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
                    
                    const diffBigAreas = generateBiggestPossibleRectangles(Array.from(ov))

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
        
    }

    return [
        {
            "Action": "Load",
            "Target": xnb.target,
            "FromFile": xnb.asset
        }
    ]
}