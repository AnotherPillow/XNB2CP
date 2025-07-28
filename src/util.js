const valid_content_folders = ['Animals', 'Characters', 'Effects', 'LooseSprites', 'Minigames', 'Strings', 'TileSheets', 'Buildings', 'Data', 'Fonts', 'Maps', 'Portraits', 'TerrainFeatures', 'VolcanoLayouts']
const valid_file_types = [
    'xnb',
    'json',
    'png',
    'tbin',
    'tmx',
    'tsx',
    'xwb',
]

function clean_uid(input) {
    return input.replace(/\s/g, '_').replace(/[^\w]/g, '.');
}

function blobToBase64(blob) {
    console.log(blob)
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        if (blob.content) reader.readAsDataURL(blob.content);
        else reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
    });
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToString(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = (err) => {
            reject(err);
        };
        reader.readAsText(blob);
    });
}

/**
 * Reads a Blob as an image and returns an HTMLImageElement.
 *
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
function blobToImage(blob) {
    console.log('b2i', blob)
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

/**
 * 
 * @param {string} p 
 */
function cleanXnbPath(p) {
    return p.toLowerCase().replace(/\.[a-z]{1,4}$/, '')
}