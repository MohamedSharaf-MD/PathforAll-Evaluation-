#!/usr/bin/env bash
SLIDES_DIR="/home/chrisparklab/MF and Spng derm cases for Christopher"
OUT_DIR="/home/chrisparklab/MF tiled"

shopt -s nullglob
for slide in "$SLIDES_DIR"/*.ndpi; do
  name="$(basename "${slide%.ndpi}")"
  ./convert_slide.sh "$slide" "$OUT_DIR/$name"
done
