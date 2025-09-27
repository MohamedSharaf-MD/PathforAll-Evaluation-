// src/app/api/admin/process-slide/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import AWS from 'aws-sdk'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('slide') as File
    const caseId = formData.get('caseId') as string
    const filename = formData.get('filename') as string

    if (!file || !caseId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['.svs', '.ndpi', '.tiff', '.tif']
    const fileExtension = path.extname(filename).toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        message: 'Invalid file type. Supported formats: SVS, NDPI, TIFF' 
      }, { status: 400 })
    }

    // Check file size (limit to 2GB)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      return NextResponse.json({ 
        message: 'File too large. Maximum size is 2GB' 
      }, { status: 400 })
    }

    console.log(`Processing slide: ${filename} (${file.size} bytes)`)

    // 1. Save the uploaded file temporarily
    const tempDir = '/tmp'
    const tempId = uuidv4()
    const inputPath = path.join(tempDir, `input_${tempId}${fileExtension}`)
    const outputDir = path.join(tempDir, `output_${tempId}`)

    // Convert File to Buffer and save
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(inputPath, buffer)

    // 2. Create output directory
    await fs.promises.mkdir(outputDir, { recursive: true })

    // 3. Get slide information using VIPS
    const slideInfo = await getSlideInfo(inputPath)
    console.log(`Slide dimensions: ${slideInfo.width}x${slideInfo.height}`)

    // 4. Convert to tiles using VIPS
    await convertToTiles(inputPath, outputDir, caseId)

    // 5. Upload tiles to S3
    const slidePath = await uploadTilesToS3(outputDir, caseId)

    // 6. Clean up temporary files
    await cleanup(inputPath, outputDir)

    console.log(`Slide processing completed: ${slidePath}`)

    return NextResponse.json({
      success: true,
      slidePath,
      width: slideInfo.width,
      height: slideInfo.height,
      maxLevel: slideInfo.maxLevel,
      message: 'Slide processed successfully'
    })

  } catch (error) {
    console.error('Slide processing error:', error)
    return NextResponse.json({ 
      message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}

async function getSlideInfo(inputPath: string): Promise<{
  width: number
  height: number
  maxLevel: number
}> {
  try {
    // Use vipsheader command that we know works
    const { stdout } = await execAsync(`vipsheader "${inputPath}"`)
    console.log('VIPS header output:', stdout)
    
    // Parse the output: "filename: 119040x25344 uchar, 4 bands, srgb, openslideload"
    const match = stdout.match(/(\d+)x(\d+)/)
    if (!match) {
      throw new Error('Could not parse image dimensions from VIPS output')
    }
    
    const width = parseInt(match[1])
    const height = parseInt(match[2])
    
    // Calculate max zoom level based on image dimensions
    const maxDimension = Math.max(width, height)
    const maxLevel = Math.max(0, Math.ceil(Math.log2(maxDimension / 256)) - 1)
    
    console.log(`Parsed dimensions: ${width}x${height}, maxLevel: ${maxLevel}`)
    
    return { width, height, maxLevel }
  } catch (error) {
    throw new Error(`Failed to get slide info: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function convertToTiles(inputPath: string, outputDir: string, caseId: string): Promise<void> {
  try {
    const outputPath = path.join(outputDir, 'slide')
    
    // Use VIPS dzsave to convert to DeepZoom tiles
    const command = [
      'vips',
      'dzsave',
      `"${inputPath}"`,
      `"${outputPath}"`,
      '--layout', 'dz',
      '--suffix', '.jpg',
      '--overlap', '1',
      '--tile-size', '256',
      '--depth', 'onetile',
      '--centre'
    ].join(' ')

    console.log(`Converting with command: ${command}`)
    
    const { stdout, stderr } = await execAsync(command, { timeout: 10 * 60 * 1000 }) // 10 minute timeout
    
    if (stderr && stderr.includes('error')) {
      throw new Error(`VIPS conversion error: ${stderr}`)
    }

    console.log('VIPS conversion completed')
    
    // Verify the conversion created the expected files
    const dziFile = `${outputPath}.dzi`
    const tilesDir = `${outputPath}_files`
    
    if (!fs.existsSync(dziFile) || !fs.existsSync(tilesDir)) {
      throw new Error('Conversion failed: expected output files not found')
    }

  } catch (error) {
    throw new Error(`Tile conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function uploadTilesToS3(outputDir: string, caseId: string): Promise<string> {
  try {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    })

    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'wsi-path'
    const slidePath = `slides/case-${caseId}`
    
    // Upload DZI file
    const dziFile = path.join(outputDir, 'slide.dzi')
    const dziContent = await fs.promises.readFile(dziFile)
    
    await s3.upload({
      Bucket: bucketName,
      Key: `${slidePath}/slide.dzi`,
      Body: dziContent,
      ContentType: 'application/xml'
    }).promise()

    // Upload all tile files
    const tilesDir = path.join(outputDir, 'slide_files')
    const uploadPromises = []

    async function uploadDirectory(dirPath: string, s3Prefix: string) {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const s3Key = `${s3Prefix}/${entry.name}`
        
        if (entry.isDirectory()) {
          await uploadDirectory(fullPath, s3Key)
        } else if (entry.isFile() && entry.name.endsWith('.jpg')) {
          const fileContent = await fs.promises.readFile(fullPath)
          uploadPromises.push(
            s3.upload({
              Bucket: bucketName,
              Key: s3Key,
              Body: fileContent,
              ContentType: 'image/jpeg'
            }).promise()
          )
        }
      }
    }

    await uploadDirectory(tilesDir, `${slidePath}/slide_files`)
    
    // Execute all uploads
    await Promise.all(uploadPromises)
    
    console.log(`Uploaded ${uploadPromises.length} tile files to S3`)
    
    return slidePath

  } catch (error) {
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function cleanup(inputPath: string, outputDir: string): Promise<void> {
  try {
    // Remove input file
    if (fs.existsSync(inputPath)) {
      await fs.promises.unlink(inputPath)
    }
    
    // Remove output directory recursively
    if (fs.existsSync(outputDir)) {
      await fs.promises.rm(outputDir, { recursive: true, force: true })
    }
    
    console.log('Cleanup completed')
  } catch (error) {
    console.error('Cleanup failed:', error)
    // Don't throw error for cleanup failure
  }
}