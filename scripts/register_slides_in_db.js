#!/usr/bin/env node

// Register uploaded slides in the database
// Usage: node scripts/register_slides_in_db.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuration
const BUCKET_NAME = 'wsi-path';
const SOURCE_DIR = '/home/chrisparklab/MF tiled';
const CLOUDFRONT_DOMAIN = 'dpyczcjhun2r2.cloudfront.net';

async function registerSlidesInDatabase() {
  console.log('🗄️  Registering slides in database...');
  
  try {
    // Find all DZ files
    const slides = [];
    const caseDirs = fs.readdirSync(SOURCE_DIR).filter(dir => 
      dir.startsWith('case_') && fs.statSync(path.join(SOURCE_DIR, dir)).isDirectory()
    );
    
    console.log(`📁 Found ${caseDirs.length} case directories`);
    
    for (const caseDir of caseDirs) {
      const casePath = path.join(SOURCE_DIR, caseDir);
      const dziFile = path.join(casePath, 'slide.dzi');
      const slideFilesDir = path.join(casePath, 'slide_files');
      
      if (fs.existsSync(dziFile) && fs.existsSync(slideFilesDir)) {
        // Read DZI file to get dimensions
        const dziContent = fs.readFileSync(dziFile, 'utf8');
        const widthMatch = dziContent.match(/Width="(\d+)"/);
        const heightMatch = dziContent.match(/Height="(\d+)"/);
        const tileSizeMatch = dziContent.match(/TileSize="(\d+)"/);
        const overlapMatch = dziContent.match(/Overlap="(\d+)"/);
        
        const width = widthMatch ? parseInt(widthMatch[1]) : 119040;
        const height = heightMatch ? parseInt(heightMatch[1]) : 25344;
        const tileSize = tileSizeMatch ? parseInt(tileSizeMatch[1]) : 256;
        const overlap = overlapMatch ? parseInt(overlapMatch[1]) : 0;
        
        // Calculate max level based on dimensions
        const maxLevel = Math.ceil(Math.log2(Math.max(width, height) / tileSize));
        
        const slideData = {
          slide_name: caseDir,
          slide_path: `https://${CLOUDFRONT_DOMAIN}/${caseDir}/slide.dzi`,
          slide_width: width,
          slide_height: height,
          max_level: maxLevel,
          original_filename: `${caseDir}.dzi`,
          upload_date: new Date().toISOString(),
          created_by: null
        };
        
        slides.push(slideData);
        console.log(`📋 Prepared: ${caseDir} (${width}x${height}, level ${maxLevel})`);
      }
    }
    
    console.log(`\n📊 Total slides to register: ${slides.length}`);
    
    if (slides.length === 0) {
      console.log('❌ No slides found to register');
      return;
    }
    
    // Insert slides into database
    console.log('💾 Inserting slides into database...');
    
    const { data, error } = await supabase
      .from('slide_library')
      .insert(slides)
      .select();
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`✅ Successfully registered ${data.length} slides in database`);
    
    // Show summary
    console.log('\n📋 Registered slides:');
    data.forEach((slide, index) => {
      console.log(`  ${index + 1}. ${slide.slide_name} (${slide.slide_width}x${slide.slide_height})`);
    });
    
    console.log('\n🎉 All slides are now available in your test creation interface!');
    console.log(`\n☁️  CloudFront URLs: https://${CLOUDFRONT_DOMAIN}/case_NAME/slide.dzi`);
    console.log(`✅ CloudFront domain configured: ${CLOUDFRONT_DOMAIN}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the registration
registerSlidesInDatabase();
