#!/bin/bash

# PathforAll - Quick System Verification Script
# This script checks if all key components are working

echo "🔍 PathforAll System Verification"
echo "================================="
echo ""

# Check if development server is running
echo "1. Checking development server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Development server is running on localhost:3000"
else
    echo "   ❌ Development server is not running. Please run 'npm run dev'"
    exit 1
fi

# Check if key pages are accessible
echo ""
echo "2. Checking key pages..."

pages=(
    "/"
    "/login"
    "/dashboard"
    "/admin"
)

for page in "${pages[@]}"; do
    if curl -s "http://localhost:3000$page" > /dev/null; then
        echo "   ✅ $page is accessible"
    else
        echo "   ❌ $page is not accessible"
    fi
done

# Check if required files exist
echo ""
echo "3. Checking required files..."

files=(
    "src/app/dashboard/page.tsx"
    "src/app/admin/page.tsx"
    "src/app/admin/test/create/page.tsx"
    "src/app/admin/test/[testId]/assign/page.tsx"
    "src/app/admin/test/[testId]/results/page.tsx"
    "src/app/admin/users/page.tsx"
    "src/app/test/[testId]/page.tsx"
    "src/app/test/[testId]/completed/page.tsx"
    "src/lib/supabase.ts"
    "database_migration.sql"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file is missing"
    fi
done

# Check if package.json has required dependencies
echo ""
echo "4. Checking dependencies..."

if [ -f "package.json" ]; then
    if grep -q "@supabase/supabase-js" package.json; then
        echo "   ✅ Supabase client is installed"
    else
        echo "   ❌ Supabase client is missing"
    fi
    
    if grep -q "lucide-react" package.json; then
        echo "   ✅ Lucide React icons are installed"
    else
        echo "   ❌ Lucide React icons are missing"
    fi
    
    if grep -q "next" package.json; then
        echo "   ✅ Next.js is installed"
    else
        echo "   ❌ Next.js is missing"
    fi
else
    echo "   ❌ package.json not found"
fi

# Check if environment variables are set
echo ""
echo "5. Checking environment variables..."

if [ -f ".env.local" ]; then
    echo "   ✅ .env.local file exists"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "   ✅ Supabase URL is configured"
    else
        echo "   ❌ Supabase URL is missing"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "   ✅ Supabase anon key is configured"
    else
        echo "   ❌ Supabase anon key is missing"
    fi
else
    echo "   ❌ .env.local file not found"
fi

echo ""
echo "🎯 Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Run the database migration in Supabase SQL Editor"
echo "2. Test the complete workflow using TESTING_GUIDE.md"
echo "3. Create admin and pathologist users"
echo "4. Upload slides and create test sessions"
echo ""
echo "For detailed testing instructions, see TESTING_GUIDE.md"
