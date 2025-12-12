'use client'

import WSIViewer from '@/components/WSIViewer'
import { Microscope } from 'lucide-react'
import Link from 'next/link'

export default function ViewerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PathforAll</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h1 className="text-xl font-semibold text-white">
              WSI Viewer Test - ME-052
            </h1>
          </div>

          <div className="p-6">
            <div className="bg-slate-900/50 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
              <WSIViewer
                slidePath="case_0NTDJG"
                slideWidth={153600}
                slideHeight={52992}
                maxLevel={10}
                height="100%"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-300">
                Controls: Mouse wheel to zoom, drag to pan, navigator in top-right corner
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
