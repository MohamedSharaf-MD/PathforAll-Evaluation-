#!/usr/bin/env bash
SLIDES_DIR="/Users/sharam03/Desktop/MF and Spng derm cases for Christopher"
OUT_DIR="/Users/sharam03/Desktop/MF Project converted"

shopt -s nullglob
for slide in "$SLIDES_DIR"/*.ndpi; do
  name="$(basename "${slide%.ndpi}")"
  ./convert_slide.sh "$slide" "$OUT_DIR/$name"
done
