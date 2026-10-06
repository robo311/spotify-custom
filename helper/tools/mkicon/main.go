// Command mkicon renders the app and tray icons from vector shapes (signed distance fields), so every
// size is drawn crisply instead of being downscaled. Run via `make icons`.
//
// Motif: a synth-knob gauge — a 270° arc whose gradient runs through a theme palette, over a dim
// track, around a light centre dot (the knob / a record's spindle), on a Darcula-dark rounded square.
// "Pro instrument", per docs/creative-direction.md.
package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"log"
	"math"
	"os"
	"path/filepath"
)

type rgba struct{ r, g, b, a float64 } // premultiplied, 0..1

func hex(s string) rgba {
	var r, g, b uint8
	if _, err := fmt.Sscanf(s, "#%02x%02x%02x", &r, &g, &b); err != nil {
		log.Fatalf("bad colour %q", s)
	}
	return rgba{float64(r) / 255, float64(g) / 255, float64(b) / 255, 1}
}

// over composites src (straight colour c with coverage a) over dst.
func over(dst rgba, c rgba, a float64) rgba {
	return rgba{
		r: c.r*a + dst.r*(1-a),
		g: c.g*a + dst.g*(1-a),
		b: c.b*a + dst.b*(1-a),
		a: a + dst.a*(1-a),
	}
}

func lerp(a, b rgba, t float64) rgba {
	return rgba{a.r + (b.r-a.r)*t, a.g + (b.g-a.g)*t, a.b + (b.b-a.b)*t, 1}
}

// coverage converts a signed distance in pixels to anti-aliased coverage.
func coverage(dPx float64) float64 { return math.Max(0, math.Min(1, 0.5-dPx)) }

func sdRoundRect(px, py, half, radius float64) float64 {
	qx, qy := math.Abs(px)-half+radius, math.Abs(py)-half+radius
	outside := math.Hypot(math.Max(qx, 0), math.Max(qy, 0))
	return outside + math.Min(math.Max(qx, qy), 0) - radius
}

func sdCircle(px, py, r float64) float64 { return math.Hypot(px, py) - r }

// sdArc is a ring segment centred on the origin from angle a0 to a1 (radians, CCW) with round caps.
func sdArc(px, py, radius, width, a0, a1 float64) float64 {
	theta := math.Atan2(py, px)
	for theta < a0 {
		theta += 2 * math.Pi
	}
	if theta <= a1 {
		return math.Abs(math.Hypot(px, py)-radius) - width/2
	}
	d0 := math.Hypot(px-radius*math.Cos(a0), py-radius*math.Sin(a0))
	d1 := math.Hypot(px-radius*math.Cos(a1), py-radius*math.Sin(a1))
	return math.Min(d0, d1) - width/2
}

// gaugeStops is the arc's gradient from its start (bottom-left) to its end (bottom-right).
var gaugeStops = []rgba{hex("#548AF7"), hex("#A07CF7"), hex("#F0786E"), hex("#F2C55C")} // blue, violet, coral, amber

// gradient samples evenly spaced stops at t in 0..1.
func gradient(stops []rgba, t float64) rgba {
	t = math.Max(0, math.Min(1, t)) * float64(len(stops)-1)
	i := int(math.Min(t, float64(len(stops)-2)))
	return lerp(stops[i], stops[i+1], t-float64(i))
}

// arcProgress is how far along the arc (0..1) the point's angle is, clamped at the caps.
func arcProgress(px, py, a0, a1 float64) float64 {
	theta := math.Atan2(py, px)
	for theta < a0 {
		theta += 2 * math.Pi
	}
	if theta > a1 { // in the gap: snap to the nearer cap
		if theta-a1 < a0+2*math.Pi-theta {
			return 1
		}
		return 0
	}
	return (theta - a0) / (a1 - a0)
}

type style struct {
	background bool    // dark rounded square behind the glyph
	mono       bool    // single-colour template (macOS menu bar)
	glyphScale float64 // glyph size relative to the canvas
}

// render draws the icon at size×size pixels. Unit coords: -1..1 across the canvas, y up.
func render(size int, st style) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	px := float64(size) / 2 // pixels per unit
	top, bottom := hex("#43454A"), hex("#1E1F22")
	ink := hex("#DFE1E5")
	black := rgba{0, 0, 0, 1}

	const ringR, ringW = 0.58, 0.2
	// The gauge sweeps clockwise from 7:30 to 4:30, like a knob's travel.
	const a0, a1 = -math.Pi / 4, 5 * math.Pi / 4 // CCW from 4:30 to 7:30; drawn as end→start
	for y := range size {
		for x := range size {
			ux := (float64(x)+0.5)/px - 1
			uy := 1 - (float64(y)+0.5)/px
			c := rgba{}

			if st.background {
				// macOS grid: 824/1024 body, ~22% corner radius.
				d := sdRoundRect(ux, uy, 0.805, 0.36)
				bg := lerp(top, bottom, (1-uy)/2)
				c = over(c, bg, coverage(d*px))
				// Inner top highlight: a hairline just inside the top edge.
				if hl := coverage(math.Abs(d+0.012)*px - 0.5); hl > 0 && uy > 0 {
					c = over(c, rgba{1, 1, 1, 1}, hl*0.10*uy)
				}
			}

			gx, gy := ux/st.glyphScale, uy/st.glyphScale
			scale := px * st.glyphScale
			if !st.mono {
				track := sdArc(gx, gy, ringR, ringW, -math.Pi, math.Pi)
				c = over(c, rgba{1, 1, 1, 1}, coverage(track*scale)*0.07)
			}
			col := black
			if !st.mono {
				col = gradient(gaugeStops, 1-arcProgress(gx, gy, a0, a1)) // clockwise from 7:30
			}
			c = over(c, col, coverage(sdArc(gx, gy, ringR, ringW, a0, a1)*scale))
			dot := ink
			if st.mono {
				dot = black
			}
			c = over(c, dot, coverage(sdCircle(gx, gy, 0.2)*scale))

			img.SetNRGBA(x, y, toNRGBA(c))
		}
	}
	return img
}

func toNRGBA(c rgba) color.NRGBA {
	if c.a <= 0 {
		return color.NRGBA{}
	}
	u := func(v float64) uint8 { return uint8(math.Round(math.Max(0, math.Min(1, v)) * 255)) }
	return color.NRGBA{u(c.r / c.a), u(c.g / c.a), u(c.b / c.a), u(c.a)}
}

func encodePNG(img image.Image) []byte {
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		log.Fatal(err)
	}
	return b.Bytes()
}

// encodeICO packs PNG images into an .ico (PNG entries are valid since Windows Vista).
func encodeICO(images []*image.NRGBA) []byte {
	var hdr, body bytes.Buffer
	n := len(images)
	_ = binary.Write(&hdr, binary.LittleEndian, [3]uint16{0, 1, uint16(n)})
	offset := 6 + 16*n
	for _, img := range images {
		data := encodePNG(img)
		w := img.Bounds().Dx()
		dim := uint8(w)
		if w >= 256 {
			dim = 0 // 0 means 256 in the ICO directory
		}
		_ = binary.Write(&hdr, binary.LittleEndian, struct {
			W, H, Colors, Reserved uint8
			Planes, BPP            uint16
			Size, Offset           uint32
		}{dim, dim, 0, 0, 1, 32, uint32(len(data)), uint32(offset)})
		offset += len(data)
		body.Write(data)
	}
	return append(hdr.Bytes(), body.Bytes()...)
}

func write(path string, data []byte) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		log.Fatal(err)
	}
}

func main() {
	assets := flag.String("assets", "assets", "output folder for app icons")
	trayDir := flag.String("tray", "internal/tray/assets", "output folder for tray icons")
	flag.Parse()

	app := style{background: true, glyphScale: 0.62}
	for _, s := range []int{16, 32, 128, 256, 512} {
		write(filepath.Join(*assets, "AppIcon.iconset", fmt.Sprintf("icon_%dx%d.png", s, s)), encodePNG(render(s, app)))
		write(filepath.Join(*assets, "AppIcon.iconset", fmt.Sprintf("icon_%dx%d@2x.png", s, s)), encodePNG(render(2*s, app)))
	}
	write(filepath.Join(*assets, "icon-512.png"), encodePNG(render(512, app)))

	write(filepath.Join(*trayDir, "tray-template.png"), encodePNG(render(32, style{mono: true, glyphScale: 1.05})))
	var trayICO []*image.NRGBA
	for _, s := range []int{16, 24, 32, 48} {
		trayICO = append(trayICO, render(s, style{glyphScale: 1.05}))
	}
	write(filepath.Join(*trayDir, "tray.ico"), encodeICO(trayICO))
	log.Printf("icons written to %s and %s", *assets, *trayDir)
}
