'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    OpenSeadragon: {
      (options: {
        element: HTMLElement;
        tileSources: Array<{
          height: number;
          width: number;
          tileSize: number;
          tileOverlap: number;
          minLevel: number;
          maxLevel: number;
          getTileUrl: (level: number, x: number, y: number) => string;
        }>;
        showNavigator: boolean;
        showRotationControl: boolean;
        showHomeControl: boolean;
        showFullPageControl: boolean;
        showZoomControl: boolean;
        mouseNavEnabled: boolean;
        animationTime: number;
        timeout: number;
        controlsFadeDelay: number;
        controlsFadeLength: number;
        prefixUrl: string;
        showSequenceControl: boolean;
        showReferenceStrip: boolean;
      }): {
        destroy: () => void;
      };
    };
  }
}

interface WSIViewerProps {
  slidePath: string  // e.g., "slides/ME-052"
  slideWidth: number
  slideHeight: number
  maxLevel?: number
  width?: string
  height?: string
}

export default function WSIViewer({ 
  slidePath, 
  slideWidth, 
  slideHeight, 
  maxLevel = 9,
  width = '100%', 
  height = '600px' 
}: WSIViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const osdViewer = useRef<{ destroy: () => void } | null>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js'
    script.onload = async () => {
      if (viewerRef.current && !osdViewer.current && window.OpenSeadragon) {
        try {
          // Get the DZI URL
          const dziUrl = slidePath.startsWith('http') 
            ? slidePath 
            : `https://dpyczcjhun2r2.cloudfront.net/${slidePath}/slide.dzi`

          // Fetch and parse the DZI file to get actual dimensions
          let actualWidth = slideWidth
          let actualHeight = slideHeight
          let actualMaxLevel = maxLevel

          try {
            const response = await fetch(dziUrl)
            const dziText = await response.text()
            const parser = new DOMParser()
            const dziDoc = parser.parseFromString(dziText, 'text/xml')
            
            const sizeElement = dziDoc.querySelector('Size')
            if (sizeElement) {
              actualWidth = parseInt(sizeElement.getAttribute('Width') || slideWidth.toString())
              actualHeight = parseInt(sizeElement.getAttribute('Height') || slideHeight.toString())
              
              // Calculate max level based on image dimensions
              const maxDimension = Math.max(actualWidth, actualHeight)
              actualMaxLevel = Math.ceil(Math.log2(maxDimension / 256))
            }
          } catch (error) {
            console.warn('Could not fetch DZI file, using provided dimensions:', error)
          }

          const customTileSource = {
            height: actualHeight,
            width: actualWidth,
            tileSize: 256,
            tileOverlap: 1,
            minLevel: 0,
            maxLevel: actualMaxLevel,
             getTileUrl: function(level: number, x: number, y: number) {
              // Check if slidePath is already a full URL
              if (slidePath.startsWith('http')) {
                // Extract the path from the full URL
                const urlParts = slidePath.split('/')
                // Find the CloudFront domain and get everything after it
                const cloudfrontIndex = urlParts.findIndex(part => part.includes('cloudfront.net'))
                if (cloudfrontIndex !== -1 && cloudfrontIndex < urlParts.length - 1) {
                  // Get the path after CloudFront domain (e.g., "slides/ME-052" or "case_0NTDJG")
                  const pathAfterCloudfront = urlParts.slice(cloudfrontIndex + 1, -1).join('/')
                  return `https://dpyczcjhun2r2.cloudfront.net/${pathAfterCloudfront}/slide_files/${level}/${x}_${y}.jpg`
                }
                // Fallback: extract case name from the end
                const caseName = urlParts[urlParts.length - 2]
                return `https://dpyczcjhun2r2.cloudfront.net/${caseName}/slide_files/${level}/${x}_${y}.jpg`
              } else {
                // Original behavior for relative paths
                return `https://dpyczcjhun2r2.cloudfront.net/${slidePath}/slide_files/${level}/${x}_${y}.jpg`
              }
            }
          }

          osdViewer.current = window.OpenSeadragon({
            element: viewerRef.current,
            tileSources: [customTileSource],
            showNavigator: true,
            showRotationControl: true,
            showHomeControl: true,
            showFullPageControl: true,
            showZoomControl: true,
            mouseNavEnabled: true,
            animationTime: 0.5,
            timeout: 30000,
            // Enhanced control styling
            controlsFadeDelay: 0,
            controlsFadeLength: 0,
            // Custom button styling
            prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
            // Ensure icons are visible
            showSequenceControl: false,
            showReferenceStrip: false
          })

          // Add custom CSS for better icon visibility (only if not already added)
          if (!document.querySelector('#openseadragon-styles')) {
            const style = document.createElement('style')
            style.id = 'openseadragon-styles'
            style.textContent = `
              .openseadragon-container {
                background-color: #000 !important;
              }
              .openseadragon-canvas {
                background-color: #000 !important;
              }
              .openseadragon-control {
                background-color: rgba(0, 0, 0, 0.8) !important;
                border: 1px solid #fff !important;
                border-radius: 4px !important;
              }
              .openseadragon-button {
                background-color: rgba(0, 0, 0, 0.8) !important;
                border: 1px solid #fff !important;
                color: #fff !important;
                font-weight: bold !important;
                text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8) !important;
              }
              .openseadragon-button:hover {
                background-color: rgba(255, 255, 255, 0.2) !important;
              }
              .openseadragon-button:active {
                background-color: rgba(255, 255, 255, 0.4) !important;
              }
              .openseadragon-zoom-in,
              .openseadragon-zoom-out,
              .openseadragon-home,
              .openseadragon-fullpage,
              .openseadragon-rotateleft,
              .openseadragon-rotateright {
                background-image: none !important;
                color: #fff !important;
                font-size: 16px !important;
                font-weight: bold !important;
                text-align: center !important;
                line-height: 20px !important;
              }
              .openseadragon-zoom-in:before {
                content: "+" !important;
              }
              .openseadragon-zoom-out:before {
                content: "−" !important;
              }
              .openseadragon-home:before {
                content: "⌂" !important;
              }
              .openseadragon-fullpage:before {
                content: "⛶" !important;
              }
              .openseadragon-rotateleft:before {
                content: "↶" !important;
              }
              .openseadragon-rotateright:before {
                content: "↷" !important;
              }
              .openseadragon-navigator {
                border: 2px solid #fff !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
              }
            `
            document.head.appendChild(style)
            styleRef.current = style
          }

        } catch (error) {
          console.error('Error initializing OpenSeadragon:', error)
        }
      }
    }
    document.head.appendChild(script)

    return () => {
      if (osdViewer.current) {
        osdViewer.current.destroy()
        osdViewer.current = null
      }
      // Don't remove the style element as it's shared across all viewers
    }
  }, [slidePath, slideWidth, slideHeight, maxLevel])

  return (
    <div 
      ref={viewerRef} 
      style={{ width, height }}
      className="border border-gray-300 rounded-lg bg-black relative"
    />
  )
}