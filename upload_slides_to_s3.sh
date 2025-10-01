#!/bin/bash

# Upload DZ files to S3 and register in database
# Usage: ./upload_slides_to_s3.sh

set -e

# Configuration
SOURCE_DIR="/home/chrisparklab/MF tiled"
BUCKET_NAME="wsi-path"
REGION="us-east-2"
PROJECT_ROOT="/home/chrisparklab/PathforAll-Evaluation-"
CLOUDFRONT_DOMAIN="dpyczcjhun2r2.cloudfront.net"

echo "🚀 Starting DZ file upload to S3..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Change to project directory
cd "$PROJECT_ROOT"

# Create a temporary file to store slide information
TEMP_FILE="/tmp/slides_to_upload.txt"
> "$TEMP_FILE"

echo "📁 Scanning DZ files..."

# Find all DZ files and prepare for upload
find "$SOURCE_DIR" -name "*.dzi" | while read -r dzi_file; do
    case_dir=$(dirname "$dzi_file")
    case_name=$(basename "$case_dir")
    slide_files_dir="$case_dir/slide_files"
    
    if [ -d "$slide_files_dir" ]; then
        echo "Found: $case_name"
        echo "$case_name|$dzi_file|$slide_files_dir" >> "$TEMP_FILE"
    else
        echo "⚠️  Warning: slide_files directory not found for $case_name"
    fi
done

# Count total slides
TOTAL_SLIDES=$(wc -l < "$TEMP_FILE")
echo "📊 Total slides to upload: $TOTAL_SLIDES"

if [ "$TOTAL_SLIDES" -eq 0 ]; then
    echo "❌ No slides found to upload"
    exit 1
fi

# Upload slides to S3
echo "☁️  Uploading to S3 bucket: $BUCKET_NAME"
UPLOADED_COUNT=0

while IFS='|' read -r case_name dzi_file slide_files_dir; do
    echo "📤 Uploading $case_name..."
    
    # Upload DZI file with proper content type
    aws s3 cp "$dzi_file" "s3://$BUCKET_NAME/$case_name/slide.dzi" \
        --region "$REGION" \
        --content-type "application/xml" \
        --cache-control "public, max-age=31536000"
    
    # Upload slide files directory with proper content types
    aws s3 sync "$slide_files_dir" "s3://$BUCKET_NAME/$case_name/slide_files/" \
        --region "$REGION" \
        --exclude "*.xml" \
        --cache-control "public, max-age=31536000"
    
    # Upload vips-properties.xml if it exists
    if [ -f "$slide_files_dir/vips-properties.xml" ]; then
        aws s3 cp "$slide_files_dir/vips-properties.xml" "s3://$BUCKET_NAME/$case_name/slide_files/vips-properties.xml" \
            --region "$REGION" \
            --content-type "application/xml" \
            --cache-control "public, max-age=31536000"
    fi
    
    UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
    echo "✅ Uploaded $case_name ($UPLOADED_COUNT/$TOTAL_SLIDES)"
    
done < "$TEMP_FILE"

echo "🎉 Upload completed! $UPLOADED_COUNT slides uploaded to S3."

# Clean up
rm -f "$TEMP_FILE"

echo ""
echo "☁️  CloudFront Configuration:"
echo "   Your slides are now available at:"
echo "   https://$CLOUDFRONT_DOMAIN/case_NAME/slide.dzi"
echo "   https://$CLOUDFRONT_DOMAIN/case_NAME/slide_files/"
echo ""
echo "📝 Next step: Run the database registration script to add these slides to your database."
echo "   Command: node scripts/register_slides_in_db.js"
echo ""
echo "✅ CloudFront domain configured: $CLOUDFRONT_DOMAIN"
