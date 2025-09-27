'use client'

import WSIViewer from '@/components/WSIViewer'

export default function ViewerPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            WSI Viewer Test - ME-052
          </h1>
          
          <WSIViewer 
            slidePath="slides/ME-052"
            slideWidth={119040}
            slideHeight={25344}
            maxLevel={9}
            height="70vh"
          />
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Controls: Mouse wheel to zoom, drag to pan, navigator in top-right corner</p>
          </div>
        </div>
      </div>
    </div>
  )
}
