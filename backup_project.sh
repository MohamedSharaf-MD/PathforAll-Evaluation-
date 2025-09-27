#!/bin/bash

# PathforAll Project Backup Script
# This script creates a comprehensive backup of your project

# Configuration
PROJECT_NAME="pathforall"
BACKUP_DIR="$HOME/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting PathforAll Project Backup${NC}"
echo -e "${BLUE}=====================================${NC}"

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Get current project directory
PROJECT_DIR="$(pwd)"

echo -e "${YELLOW}📁 Project Directory: ${PROJECT_DIR}${NC}"
echo -e "${YELLOW}💾 Backup Directory: ${BACKUP_PATH}${NC}"
echo ""

# 1. Copy source code
echo -e "${GREEN}📋 Copying source code...${NC}"
cp -r src/ "$BACKUP_PATH/"
cp -r public/ "$BACKUP_PATH/" 2>/dev/null || echo "No public directory found"
cp package.json "$BACKUP_PATH/"
cp package-lock.json "$BACKUP_PATH/"
cp tsconfig.json "$BACKUP_PATH/"
cp next.config.ts "$BACKUP_PATH/"
cp postcss.config.mjs "$BACKUP_PATH/"
cp eslint.config.mjs "$BACKUP_PATH/"
cp next-env.d.ts "$BACKUP_PATH/"
cp README.md "$BACKUP_PATH/"
cp .gitignore "$BACKUP_PATH/"
cp convert_slide.sh "$BACKUP_PATH/"

# 2. Copy documentation and scripts
echo -e "${GREEN}📚 Copying documentation and scripts...${NC}"
cp TESTING_GUIDE.md "$BACKUP_PATH/"
cp SUPABASE_VERIFICATION.md "$BACKUP_PATH/"
cp verify_system.sh "$BACKUP_PATH/"
cp database_migration.sql "$BACKUP_PATH/"

# 3. Create environment template
echo -e "${GREEN}🔐 Creating environment template...${NC}"
cat > "$BACKUP_PATH/.env.template" << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AWS Configuration (for slide processing)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name_here
EOF

# 4. Create backup info file
echo -e "${GREEN}📝 Creating backup information...${NC}"
cat > "$BACKUP_PATH/BACKUP_INFO.txt" << EOF
PathforAll Project Backup
========================

Backup Date: $(date)
Project Directory: ${PROJECT_DIR}
Backup Location: ${BACKUP_PATH}

Features Included in this Backup:
- Complete source code (src/ directory)
- Configuration files (package.json, tsconfig.json, etc.)
- Documentation (TESTING_GUIDE.md, SUPABASE_VERIFICATION.md)
- Database migration script (database_migration.sql)
- System verification script (verify_system.sh)
- Slide conversion script (convert_slide.sh)
- Environment template (.env.template)

Current Project Status:
- ✅ Admin dashboard with test management
- ✅ Pathologist dashboard with assigned tests
- ✅ Test creation with slide library integration
- ✅ Test taking interface with WSI viewer
- ✅ Results viewing and CSV export
- ✅ User management (add/edit/delete users)
- ✅ Complete Supabase integration
- ✅ Database schema with proper relationships

To restore this backup:
1. Create a new project directory
2. Copy all files from this backup
3. Run: npm install
4. Create .env.local with your actual environment variables
5. Run: npm run dev

Database Setup:
- Run the database_migration.sql script in your Supabase SQL editor
- Ensure all tables and relationships are created properly

System Requirements:
- Node.js 18+
- npm or yarn
- Supabase account
- AWS account (for slide processing)
- VIPS installed (for slide conversion)
EOF

# 5. Create git archive (if git repository)
if [ -d ".git" ]; then
    echo -e "${GREEN}📦 Creating git archive...${NC}"
    git archive --format=tar.gz --output="$BACKUP_PATH/project_source.tar.gz" HEAD
fi

# 6. Create compressed backup
echo -e "${GREEN}🗜️  Creating compressed backup...${NC}"
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
cd "$PROJECT_DIR"

# 7. Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
COMPRESSED_SIZE=$(du -sh "${BACKUP_PATH}.tar.gz" | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}=================================${NC}"
echo -e "${BLUE}📁 Backup Directory: ${BACKUP_PATH}${NC}"
echo -e "${BLUE}📦 Compressed File: ${BACKUP_PATH}.tar.gz${NC}"
echo -e "${BLUE}📊 Backup Size: ${BACKUP_SIZE}${NC}"
echo -e "${BLUE}🗜️  Compressed Size: ${COMPRESSED_SIZE}${NC}"
echo ""

# 8. Create restore script
echo -e "${GREEN}🔧 Creating restore script...${NC}"
cat > "$BACKUP_PATH/restore.sh" << 'EOF'
#!/bin/bash

# PathforAll Project Restore Script
echo "🚀 Restoring PathforAll Project..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for environment file
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found."
    echo "📝 Please create .env.local using the .env.template as a guide."
    echo "🔐 You'll need your Supabase and AWS credentials."
fi

echo "✅ Restore completed!"
echo "🚀 Run 'npm run dev' to start the development server."
EOF

chmod +x "$BACKUP_PATH/restore.sh"

echo -e "${YELLOW}💡 Next Steps:${NC}"
echo -e "${YELLOW}1. Keep the backup file safe: ${BACKUP_PATH}.tar.gz${NC}"
echo -e "${YELLOW}2. To restore: extract the tar.gz file and run restore.sh${NC}"
echo -e "${YELLOW}3. Don't forget to update your .env.local with actual credentials${NC}"
echo ""

# 9. Optional: Upload to cloud storage (if configured)
if command -v aws &> /dev/null; then
    echo -e "${YELLOW}☁️  AWS CLI detected. Would you like to upload to S3? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}☁️  Uploading to S3...${NC}"
        aws s3 cp "${BACKUP_PATH}.tar.gz" "s3://your-backup-bucket/pathforall-backups/" || echo "❌ S3 upload failed. Please check your AWS configuration."
    fi
fi

echo -e "${GREEN}🎉 Backup process completed!${NC}"
