package encoder

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"

	"github.com/cloudphone/media-service/internal/capture"
)

// ImageConverter converts images between different formats
type ImageConverter struct{}

// NewImageConverter creates a new image converter
func NewImageConverter() *ImageConverter {
	return &ImageConverter{}
}

// DecodeFrame decodes a frame from PNG/JPEG to image.Image
func (ic *ImageConverter) DecodeFrame(frame *capture.Frame) (image.Image, error) {
	reader := bytes.NewReader(frame.Data)

	switch frame.Format {
	case capture.FrameFormatPNG:
		return png.Decode(reader)
	case capture.FrameFormatJPEG:
		return jpeg.Decode(reader)
	default:
		return nil, fmt.Errorf("unsupported format: %s", frame.Format)
	}
}

// ImageToI420 converts an image.Image to I420 (YUV420) format
// I420 format: Y plane (full size) + U plane (1/4 size) + V plane (1/4 size)
func (ic *ImageConverter) ImageToI420(img image.Image) ([]byte, error) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Validate dimensions (must be even for YUV420)
	if width%2 != 0 || height%2 != 0 {
		return nil, fmt.Errorf("image dimensions must be even (got %dx%d)", width, height)
	}

	// Calculate plane sizes
	ySize := width * height
	uvSize := (width / 2) * (height / 2)
	totalSize := ySize + uvSize*2

	i420 := make([]byte, totalSize)

	// Pointers to each plane
	yPlane := i420[0:ySize]
	uPlane := i420[ySize : ySize+uvSize]
	vPlane := i420[ySize+uvSize:]

	// Convert RGB to YUV
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r, g, b, _ := img.At(x+bounds.Min.X, y+bounds.Min.Y).RGBA()

			// Convert from 16-bit to 8-bit
			r8 := uint8(r >> 8)
			g8 := uint8(g >> 8)
			b8 := uint8(b >> 8)

			// RGB to YUV conversion (BT.601)
			yVal := ic.rgbToY(r8, g8, b8)
			yPlane[y*width+x] = yVal

			// Subsample U and V (only for even positions)
			if x%2 == 0 && y%2 == 0 {
				uVal := ic.rgbToU(r8, g8, b8)
				vVal := ic.rgbToV(r8, g8, b8)

				uvX := x / 2
				uvY := y / 2
				uvIndex := uvY*(width/2) + uvX

				uPlane[uvIndex] = uVal
				vPlane[uvIndex] = vVal
			}
		}
	}

	return i420, nil
}

// RGB to Y (luminance) - BT.601
func (ic *ImageConverter) rgbToY(r, g, b uint8) uint8 {
	y := 16 + (66*int(r)+129*int(g)+25*int(b)+128)/256
	return ic.clamp(y)
}

// RGB to U (chrominance)
func (ic *ImageConverter) rgbToU(r, g, b uint8) uint8 {
	u := 128 + (-38*int(r)-74*int(g)+112*int(b)+128)/256
	return ic.clamp(u)
}

// RGB to V (chrominance)
func (ic *ImageConverter) rgbToV(r, g, b uint8) uint8 {
	v := 128 + (112*int(r)-94*int(g)-18*int(b)+128)/256
	return ic.clamp(v)
}

// Clamp value to 0-255 range
func (ic *ImageConverter) clamp(val int) uint8 {
	if val < 0 {
		return 0
	}
	if val > 255 {
		return 255
	}
	return uint8(val)
}

// FrameToI420 converts a capture.Frame to I420 format
func (ic *ImageConverter) FrameToI420(frame *capture.Frame) ([]byte, int, int, error) {
	// Decode frame to image
	img, err := ic.DecodeFrame(frame)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("failed to decode frame: %w", err)
	}

	// Convert to I420
	i420, err := ic.ImageToI420(img)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("failed to convert to I420: %w", err)
	}

	bounds := img.Bounds()
	return i420, bounds.Dx(), bounds.Dy(), nil
}

// ResizeImage resizes an image to the target dimensions
// This is a simple nearest-neighbor resize for performance
func (ic *ImageConverter) ResizeImage(img image.Image, targetWidth, targetHeight int) image.Image {
	bounds := img.Bounds()
	srcWidth := bounds.Dx()
	srcHeight := bounds.Dy()

	if srcWidth == targetWidth && srcHeight == targetHeight {
		return img
	}

	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))

	xRatio := float64(srcWidth) / float64(targetWidth)
	yRatio := float64(srcHeight) / float64(targetHeight)

	for y := 0; y < targetHeight; y++ {
		for x := 0; x < targetWidth; x++ {
			srcX := int(float64(x) * xRatio)
			srcY := int(float64(y) * yRatio)

			// Clamp to source bounds
			if srcX >= srcWidth {
				srcX = srcWidth - 1
			}
			if srcY >= srcHeight {
				srcY = srcHeight - 1
			}

			dst.Set(x, y, img.At(srcX+bounds.Min.X, srcY+bounds.Min.Y))
		}
	}

	return dst
}
