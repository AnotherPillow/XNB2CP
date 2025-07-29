// https://go.dev/wiki/WebAssembly

package main

import (
	"fmt"
	"syscall/js"
)

func pack12x2(a, b uint16) uint32 {
	return (uint32(a&0xFFF) << 12) | uint32(b&0xFFF)
}

func unpack12x2(packed uint32) (a, b uint16) {
	return uint16((packed >> 12) & 0xFFF), uint16(packed & 0xFFF)
}

func diffImagesToOverlay(this js.Value, args []js.Value) interface{} {
	if len(args) < 4 {
		return js.ValueOf([]interface{}{})
	}
	w := args[0].Int()
	h := args[1].Int()
	pxA := args[2]
	pxB := args[3]

	data := make([]uint32, 0)

	tilesX := (w + 15) / 16
	tilesY := (h + 15) / 16

	for ty := 0; ty < tilesY; ty++ {
		for tx := 0; tx < tilesX; tx++ {
			tileX := tx * 16
			tileY := ty * 16
			var foundDiff bool

			for dy := 0; dy < 16 && !foundDiff; dy++ {
				y := tileY + dy
				if y >= h {
					break
				}
				for dx := 0; dx < 16; dx++ {
					x := tileX + dx
					if x >= w {
						break
					}
					idx := (y*w + x) * 4
					Ar := pxA.Index(idx).Int()
					Ag := pxA.Index(idx + 1).Int()
					Ab := pxA.Index(idx + 2).Int()
					Aa := pxA.Index(idx + 3).Int()
					Br := pxB.Index(idx).Int()
					Bg := pxB.Index(idx + 1).Int()
					Bb := pxB.Index(idx + 2).Int()
					Ba := pxB.Index(idx + 3).Int()

					if Ar != Br || Ag != Bg || Ab != Bb || Aa != Ba {
						foundDiff = true
						break
					}
				}
			}

			if foundDiff {
				data = append(data, pack12x2(uint16(tileX), uint16(tileY)))
			}
		}
	}

	arr := js.Global().Get("Uint32Array").New(len(data))
	for i, v := range data {
		arr.SetIndex(i, v)
	}
	return arr
}

func main() {
	fmt.Println("Go WebAssembly Loaded")

	js.Global().Set("go_diffImagesToOverlay", js.FuncOf(diffImagesToOverlay))

	// keep running
	select {}
}
