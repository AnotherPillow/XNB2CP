self.addEventListener('message', function(event) {
    const { id, imageDataA, imageDataB, width, height } = event.data;
    console.log(`worker ${id} spawned`)
    
    /**
     * @type {Set<string>} set of 'x,y'
     */
    const diffPixels = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            const floordeTo16X = x & ~0xF;
            const floordeTo16Y = y & ~0xF;
            
            const [Ar, Ag, Ab, Aa] = imageDataA.data.slice(index);
            const [Br, Bg, Bb, Ba] = imageDataB.data.slice(index);

            if (Ar != Br
                || Ag != Bg
                || Ab != Bb
                || Aa != Ba
            ) {
                diffPixels.add(`${floordeTo16X},${floordeTo16Y}`);
                x = floordeTo16X + 15   
            }
        }
    }

    self.postMessage({
        id: id,
        diffPixels: Array.from(diffPixels)
    });
});