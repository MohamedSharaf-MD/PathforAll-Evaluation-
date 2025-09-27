// src/app/test/[testId]/completed/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Clock, Target, BarChart3, Download, Home } from 'lucide-react'
import CertificateModal from '@/components/CertificateModal'

interface CompletionStats {
  totalCases: number
  totalTimeMinutes: number
  averageTimePerCase: number
  testTitle: string
  completedAt: string
  accuracy: number
  userProfile: {
    full_name: string
    specialty?: string
    institution?: string
  }
}

export default function TestCompletionPage() {
  const params = useParams()
  const router = useRouter()
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCertificate, setShowCertificate] = useState(false)

  useEffect(() => {
    loadCompletionStats()
  }, [])

  const loadCompletionStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get test session info
      const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('title')
        .eq('id', params.testId)
        .single()

      if (sessionError) throw sessionError

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, specialty, institution')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Get assignment completion time
      const { data: assignment, error: assignmentError } = await supabase
        .from('user_assignments')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('test_session_id', params.testId)
        .single()

      if (assignmentError) throw assignmentError

      // Get response statistics
      const { data: responses, error: responsesError } = await supabase
        .from('case_responses')
        .select(`
          time_spent_seconds,
          selected_answer,
          cases!inner(
            test_session_id,
            correct_answer
          )
        `)
        .eq('user_id', user.id)
        .eq('cases.test_session_id', params.testId)

      if (responsesError) throw responsesError

      const totalTimeSeconds = responses.reduce((sum, r) => sum + r.time_spent_seconds, 0)
      const totalTimeMinutes = Math.round(totalTimeSeconds / 60)
      const averageTimePerCase = Math.round(totalTimeSeconds / responses.length)
      
      // Calculate accuracy
      const correctAnswers = responses.filter(r => r.selected_answer === r.cases?.correct_answer).length
      const accuracy = responses.length > 0 ? Math.round((correctAnswers / responses.length) * 100) : 0

      setStats({
        totalCases: responses.length,
        totalTimeMinutes,
        averageTimePerCase,
        testTitle: session.title,
        completedAt: assignment.completed_at,
        userProfile: profile,
        accuracy
      })

    } catch (error) {
      console.error('Error loading completion stats:', error)
      setError('Failed to load completion statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    })
  }

  const downloadCertificate = () => {
    setShowCertificate(true)
  }

  const getCertificateData = () => {
    if (!stats) return null
    
    const data = {
      userName: stats.userProfile?.full_name || 'User',
      testTitle: stats.testTitle,
      completedAt: formatDateTime(stats.completedAt),
      accuracy: stats.accuracy,
      totalCases: stats.totalCases,
      totalTime: formatTime(stats.totalTimeMinutes * 60)
    }
    
    console.log('Certificate data:', data)
    return data
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading completion summary...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Completed Successfully!</h1>
          <p className="text-xl text-gray-600">
            You have successfully completed <span className="font-semibold">{stats.testTitle}</span>
          </p>
        </div>

        {/* Completion Summary Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">Completion Summary</h2>
            <p className="text-indigo-100 mt-1">
              Completed on {formatDateTime(stats.completedAt)}
            </p>
          </div>

          <div className="p-8">
            {/* Participant Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-lg text-gray-900 font-medium">{stats.userProfile.full_name}</dd>
                </div>
                {stats.userProfile.specialty && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Specialty</dt>
                    <dd className="text-lg text-gray-900">{stats.userProfile.specialty}</dd>
                  </div>
                )}
                {stats.userProfile.institution && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Institution</dt>
                    <dd className="text-lg text-gray-900">{stats.userProfile.institution}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Test Session</dt>
                  <dd className="text-lg text-gray-900">{stats.testTitle}</dd>
                </div>
              </div>
            </div>

            {/* Performance Statistics */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900 mb-1">{stats.totalCases}</div>
                <div className="text-blue-700 font-medium">Cases Completed</div>
              </div>

              <div className="bg-green-50 rounded-lg p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-900 mb-1">{stats.totalTimeMinutes}m</div>
                <div className="text-green-700 font-medium">Total Time</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-900 mb-1">
                  {formatTime(stats.averageTimePerCase)}
                </div>
                <div className="text-purple-700 font-medium">Avg. per Case</div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">What happens next?</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">1</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Responses Recorded</h4>
                <p className="text-gray-600">Your responses have been securely saved and timestamped.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">2</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Administrator Review</h4>
                <p className="text-gray-600">Test administrators will review all responses and compile results.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">3</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Results Available</h4>
                <p className="text-gray-600">Detailed results and feedback will be provided when available.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={downloadCertificate}
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Download className="h-5 w-5 mr-2" />
            Download Completion Certificate
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Dashboard
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Thank you for participating in this pathology evaluation session.
            <br />
            For questions or technical support, please contact your administrator.
          </p>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && getCertificateData() && (
        <CertificateModal
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          certificateData={getCertificateData()!}
        />
      )}
    </div>
  )
}
