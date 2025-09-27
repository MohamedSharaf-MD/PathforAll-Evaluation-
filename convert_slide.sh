#!/bin/bash

# Usage: ./convert_slide.sh input.svs output_folder
INPUT_FILE=$1
OUTPUT_DIR=$2

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Convert to DeepZoom tiles (most efficient for web)
vips dzsave "$INPUT_FILE" "$OUTPUT_DIR/slide" \
  --layout dz \
  --suffix .jpg \
  --overlap 1 \
  --tile-size 256 \
  --depth onetile

echo "Conversion complete! Tiles saved to $OUTPUT_DIR"
