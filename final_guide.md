# PathforAll WSI Evaluation Platform - Complete Guide

## Overview
This guide covers the complete process of converting, uploading, and configuring Whole Slide Images (WSI) for the PathforAll evaluation platform.

## Prerequisites

### Required Software
- **VIPS (VASARI Image Processing System)** - For converting WSI to DeepZoom format
- **AWS CLI** - For uploading to S3
- **Node.js** - For database registration scripts
- **Git** - For cloning the repository

## Linux Machine Setup

### Step 1: Install Required Software

#### Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install VIPS
sudo apt install libvips-dev

# Install Node.js (using NodeSource repository for latest version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Git (if not already installed)
sudo apt install git

# Clean up
rm -rf aws awscliv2.zip
```

#### CentOS/RHEL/Fedora:
```bash
# Install VIPS
sudo dnf install vips-devel  # or yum install vips-devel

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs  # or yum install nodejs

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Git
sudo dnf install git  # or yum install git

# Clean up
rm -rf aws awscliv2.zip
```

### Step 2: Clone the Repository
```bash
# Clone the repository
git clone https://github.com/MohamedSharaf-MD/PathforAll-Evaluation-.git
cd PathforAll-Evaluation-

# Install Node.js dependencies
npm install
```

### Step 3: Configure AWS CLI
```bash
# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-2
# Default output format: json
```

### Step 4: Set Environment Variables
```bash
# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://tinowjauxxreqxvoawhm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzI0OTAsImV4cCI6MjA3NDUwODQ5MH0.hUzzVdhQEzX_SnDvCiTzqc_qj2u1DUENynTZjSdH6VQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0
EOF
```

### Step 5: Make Scripts Executable
```bash
# Make all shell scripts executable
chmod +x convert_slide.sh
chmod +x batch_convert.sh
chmod +x upload_slides_to_s3.sh
chmod +x backup_project.sh
chmod +x verify_system.sh
```

### Step 6: Verify Installation
```bash
# Test VIPS installation
vips --version

# Test AWS CLI
aws --version

# Test Node.js
node --version
npm --version

# Test Git
git --version
```

### Step 7: Update Script Paths (if needed)
If your Linux machine has different paths, update the scripts:

```bash
# Edit upload_slides_to_s3.sh
nano upload_slides_to_s3.sh
# Update SOURCE_DIR to your converted slides directory
# Update PROJECT_ROOT to your cloned repository path

# Edit scripts/register_slides_in_db.js
nano scripts/register_slides_in_db.js
# Update SOURCE_DIR to your converted slides directory
```

### Required Credentials
- **Supabase Project URL**: `https://tinowjauxxreqxvoawhm.supabase.co`
- **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzI0OTAsImV4cCI6MjA3NDUwODQ5MH0.hUzzVdhQEzX_SnDvCiTzqc_qj2u1DUENynTZjSdH6VQ`
- **Supabase Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0`
- **AWS S3 Bucket**: `wsi-path`
- **AWS Region**: `us-east-2`
- **CloudFront Domain**: `dpyczcjhun2r2.cloudfront.net`

## Step 1: Convert WSI Files to DeepZoom Format

### Single File Conversion
```bash
# Navigate to your project directory
cd /Users/sharam03/pathforall

# Make the conversion script executable
chmod +x convert_slide.sh

# Convert a single slide (replace with your file path)
./convert_slide.sh /path/to/your/slide.ndpi
```

### Batch Conversion
```bash
# Make the batch conversion script executable
chmod +x batch_convert.sh

# Convert all slides in a directory
./batch_convert.sh /path/to/your/slides/directory
```

### Manual VIPS Conversion
If you need to convert manually:
```bash
# Convert NDPI to DeepZoom
vips dzsave input.ndpi output --tile-size 256 --overlap 1 --depth onepixel

# Convert SVS to DeepZoom
vips dzsave input.svs output --tile-size 256 --overlap 1 --depth onepixel
```

## Step 2: Upload Converted Slides to S3

### Configure AWS CLI (if not already done)
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-2
# Default output format: json
```

### Upload Slides
```bash
# Make the upload script executable
chmod +x upload_slides_to_s3.sh

# Upload all converted slides
./upload_slides_to_s3.sh
```

**What this script does:**
- Uploads DZI files to `s3://wsi-path/case_NAME/slide.dzi`
- Uploads tile images to `s3://wsi-path/case_NAME/slide_files/`
- Sets appropriate headers for CloudFront caching
- Shows progress for each file uploaded

## Step 3: Register Slides in Database

### Set Environment Variables
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://tinowjauxxreqxvoawhm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0"
```

### Register Slides
```bash
# Navigate to project root
cd /Users/sharam03/pathforall

# Run the registration script
node scripts/register_slides_in_db.js
```

**What this script does:**
- Reads DZI metadata from each case folder
- Extracts slide dimensions and properties
- Registers slides in the `slide_library` table
- Uses CloudFront URLs for slide paths

## Step 4: Test the Uploaded Slides

### Local Testing
```bash
# Start the development server
npm run dev

# Open browser to: http://localhost:3000
# Navigate to: http://localhost:3000/admin/test/create
# Check if your slides appear in the slide selection dropdown
```

### Public Testing
- Wait for Vercel deployment (1-2 minutes after git push)
- Visit your public site
- Navigate to the test creation page
- Verify slides are available and display correctly

## Step 5: Create Tests with Uploaded Slides

1. **Go to Admin Panel**: `/admin/test/create`
2. **Create New Test**: Fill in test details
3. **Add Cases**: 
   - Select your uploaded slide from the dropdown
   - Add questions and answer choices
   - Use "Create from Template" to duplicate cases with different slides
4. **Save Test**: The test will be available for assignment

## File Structure After Conversion

```
/Users/sharam03/Desktop/MF Project converted/
├── case_XXXXX/
│   ├── slide.dzi          # DeepZoom metadata file
│   └── slide_files/       # Tile images
│       ├── 0/             # Level 0 tiles
│       ├── 1/             # Level 1 tiles
│       └── ...            # Additional levels
```

## S3 Structure After Upload

```
s3://wsi-path/
├── case_XXXXX/
│   ├── slide.dzi          # CloudFront: https://dpyczcjhun2r2.cloudfront.net/case_XXXXX/slide.dzi
│   └── slide_files/       # CloudFront: https://dpyczcjhun2r2.cloudfront.net/case_XXXXX/slide_files/
│       ├── 0/0_0.jpg
│       ├── 0/0_1.jpg
│       └── ...
```

## Database Schema

The `slide_library` table contains:
- `id` (uuid)
- `slide_name` (text) - Case identifier
- `slide_path` (text) - Full CloudFront URL
- `slide_width` (integer) - Image width in pixels
- `slide_height` (integer) - Image height in pixels
- `max_level` (integer) - Maximum zoom level
- `original_filename` (text) - Original file name
- `upload_date` (timestamp) - When uploaded
- `created_by` (uuid) - User who uploaded (null for script uploads)

## Troubleshooting

### Common Issues

1. **"Image load aborted" errors**
   - Fixed in WSIViewer component
   - No action needed for future uploads

2. **"Could not find table" errors**
   - Ensure you're using the service role key, not anon key
   - Check that the `slide_library` table exists

3. **RLS (Row Level Security) errors**
   - Use the service role key for database operations
   - The anon key has limited permissions

4. **AWS upload failures**
   - Verify AWS credentials are configured
   - Check S3 bucket permissions
   - Ensure the bucket name is correct: `wsi-path`

### Verification Commands

```bash
# Check if slides are in S3
aws s3 ls s3://wsi-path/ --recursive

# Check if slides are in database
# (Use Supabase dashboard or run a query)

# Test CloudFront URLs
curl -I https://dpyczcjhun2r2.cloudfront.net/case_XXXXX/slide.dzi
```

## Environment Variables for Local Development

Create `.env.local` in your project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tinowjauxxreqxvoawhm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzI0OTAsImV4cCI6MjA3NDUwODQ5MH0.hUzzVdhQEzX_SnDvCiTzqc_qj2u1DUENynTZjSdH6VQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0
```

## Quick Reference Commands

### For Mac (Original Setup)
```bash
# Complete workflow for new slides
cd /Users/sharam03/pathforall

# 1. Convert slides
./batch_convert.sh /path/to/slides

# 2. Upload to S3
./upload_slides_to_s3.sh

# 3. Register in database
export NEXT_PUBLIC_SUPABASE_URL="https://tinowjauxxreqxvoawhm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0"
node scripts/register_slides_in_db.js

# 4. Test locally
npm run dev
# Visit: http://localhost:3000/admin/test/create

# 5. Push to production
git add .
git commit -m "Add new slides"
git push origin main
```

### For Linux Machine (New Setup)
```bash
# Complete workflow for new slides
cd /path/to/PathforAll-Evaluation-

# 1. Convert slides
./batch_convert.sh /path/to/slides

# 2. Upload to S3
./upload_slides_to_s3.sh

# 3. Register in database
export NEXT_PUBLIC_SUPABASE_URL="https://tinowjauxxreqxvoawhm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbm93amF1eHhyZXF4dm9hd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjQ5MCwiZXhwIjoyMDc0NTA4NDkwfQ.jecmv4Ly3n4wvwUHS1eA9skIl6wltaGw-kMWy79Web0"
node scripts/register_slides_in_db.js

# 4. Test locally
npm run dev
# Visit: http://localhost:3000/admin/test/create

# 5. Push to production
git add .
git commit -m "Add new slides"
git push origin main
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all credentials are correct
3. Ensure AWS CLI is configured properly
4. Check that VIPS is installed and working
5. Verify the database connection

---

**Last Updated**: January 2025
**Platform Version**: Next.js 15.5.4 with Supabase and AWS S3/CloudFront
