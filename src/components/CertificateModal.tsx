'use client'

import { useState } from 'react'
import { Download, FileText, User, Calendar, Award } from 'lucide-react'

interface CertificateData {
  userName: string
  testTitle: string
  completedAt: string
  accuracy: number
  totalCases: number
  totalTime: string
}

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  certificateData: CertificateData
}

export default function CertificateModal({ isOpen, onClose, certificateData }: CertificateModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const generateCertificate = async () => {
    setIsGenerating(true)
    
    try {
      // Validate certificate data
      if (!certificateData || !certificateData.userName) {
        console.error('Invalid certificate data:', certificateData)
        setIsGenerating(false)
        return
      }

      // Create a canvas to generate the certificate
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas size for A4 paper (300 DPI)
      canvas.width = 2480
      canvas.height = 3508
      
      if (!ctx) return

      // Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Border
      ctx.strokeStyle = '#1e40af'
      ctx.lineWidth = 20
      ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200)

      // Inner border
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 8
      ctx.strokeRect(200, 200, canvas.width - 400, canvas.height - 400)

      // Title
      ctx.fillStyle = '#1e40af'
      ctx.font = 'bold 120px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 500)

      // Subtitle
      ctx.fillStyle = '#374151'
      ctx.font = '48px Arial'
      ctx.fillText('PathforAll WSI Evaluation Platform', canvas.width / 2, 600)

      // This is to certify that
      ctx.fillStyle = '#374151'
      ctx.font = '64px Arial'
      ctx.fillText('This is to certify that', canvas.width / 2, 800)

      // User name
      ctx.fillStyle = '#1e40af'
      ctx.font = 'bold 96px Arial'
      ctx.fillText(certificateData.userName || 'User', canvas.width / 2, 950)

      // Has successfully completed
      ctx.fillStyle = '#374151'
      ctx.font = '64px Arial'
      ctx.fillText('has successfully completed the', canvas.width / 2, 1100)

      // Test title
      ctx.fillStyle = '#1e40af'
      ctx.font = 'bold 80px Arial'
      ctx.fillText(`"${certificateData.testTitle || 'Test'}"`, canvas.width / 2, 1200)

      // Test details
      ctx.fillStyle = '#374151'
      ctx.font = '48px Arial'
      
      const detailsY = 1400
      ctx.fillText(`Test Completion Details:`, canvas.width / 2, detailsY)
      ctx.fillText(`Accuracy: ${certificateData.accuracy || 0}%`, canvas.width / 2, detailsY + 80)
      ctx.fillText(`Cases Completed: ${certificateData.totalCases || 0}`, canvas.width / 2, detailsY + 160)
      ctx.fillText(`Total Time: ${certificateData.totalTime || '0m 0s'}`, canvas.width / 2, detailsY + 240)

      // Completion date
      ctx.fillText(`Completed on: ${certificateData.completedAt || 'N/A'}`, canvas.width / 2, detailsY + 320)

      // Signature line
      ctx.fillStyle = '#374151'
      ctx.font = '48px Arial'
      ctx.fillText('Christopher Park\'s Lab', canvas.width / 2, 2000)
      ctx.fillText('New York University Langone Health', canvas.width / 2, 2080)

      // Footer
      ctx.fillStyle = '#6b7280'
      ctx.font = '36px Arial'
      ctx.fillText('This certificate is digitally generated and verifiable', canvas.width / 2, 2400)
      ctx.fillText('PathforAll - Professional WSI Evaluation Platform', canvas.width / 2, 2480)

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          // Safe filename generation with fallbacks
          const safeUserName = (certificateData.userName || 'User').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
          a.download = `PathforAll_Certificate_${safeUserName}_${new Date().toISOString().split('T')[0]}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
        setIsGenerating(false)
      }, 'image/png')

    } catch (error) {
      console.error('Error generating certificate:', error)
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Award className="h-8 w-8 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Certificate of Completion</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Certificate Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-8 mb-6">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-indigo-800 mb-2">CERTIFICATE OF COMPLETION</h3>
              <p className="text-lg text-indigo-600 mb-6">PathforAll WSI Evaluation Platform</p>
              
              <div className="space-y-4">
                <p className="text-xl text-gray-700">This is to certify that</p>
                <h4 className="text-2xl font-bold text-indigo-800">{certificateData.userName || 'User'}</h4>
                <p className="text-xl text-gray-700">has successfully completed the</p>
                <h5 className="text-xl font-bold text-indigo-800">"{certificateData.testTitle || 'Test'}"</h5>
              </div>

              <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
                <h6 className="text-lg font-semibold text-gray-800 mb-4">Test Completion Details:</h6>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-semibold text-gray-900">{certificateData.accuracy || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cases Completed:</span>
                    <span className="font-semibold text-gray-900">{certificateData.totalCases || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Time:</span>
                    <span className="font-semibold text-gray-900">{certificateData.totalTime || '0m 0s'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-semibold text-gray-900">{certificateData.completedAt || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-sm text-gray-700">
                <p className="font-semibold">Christopher Park's Lab</p>
                <p className="font-semibold">New York University Langone Health</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={generateCertificate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Download Certificate</span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>Certificate will be downloaded as a high-resolution PNG image</p>
          </div>
        </div>
      </div>
    </div>
  )
}
