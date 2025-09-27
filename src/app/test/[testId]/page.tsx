// src/app/test/[testId]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import WSIViewer from '@/components/WSIViewer'
import { supabase } from '@/lib/supabase'
import { Clock, ChevronLeft, ChevronRight, Flag, AlertCircle, CheckCircle2 } from 'lucide-react'

interface TestCase {
  id: string
  case_number: number
  title: string
  question: string
  choices: string[]
  slide_path: string
  slide_width: number
  slide_height: number
  max_level: number
}

interface TestSession {
  id: string
  title: string
  description: string
  instructions: string
  cases: TestCase[]
}

export default function TestInterface() {
  const params = useParams()
  const router = useRouter()
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [caseStartTime, setCaseStartTime] = useState<number>(Date.now())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadTestSession()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const loadTestSession = async () => {
    try {
      // Load test session with cases
      const { data: session, error } = await supabase
        .from('test_sessions')
        .select(`
          *,
          cases (
            id,
            case_number,
            title,
            question,
            choices,
            slide_url,
            case_order
          )
        `)
        .eq('id', params.testId)
        .single()

      if (error) throw error

      // Transform the data to match our interface
      const transformedSession: TestSession = {
        ...session,
        cases: session.cases.map((case_: { slide_url: string; case_order: number; [key: string]: unknown }) => ({
          ...case_,
          slide_path: case_.slide_url || '', // Use slide_url directly (it already contains the full path)
          slide_width: 119040, // Default values - you'll want to store these in DB
          slide_height: 25344,
          max_level: 9
        })).sort((a: { case_order: number }, b: { case_order: number }) => a.case_order - b.case_order)
      }

      setTestSession(transformedSession)
      setLoading(false)
    } catch (error) {
      console.error('Error loading test session:', error)
      setLoading(false)
    }
  }

  const startTest = () => {
    setShowInstructions(false)
    setCaseStartTime(Date.now())
  }

  const handleAnswerSelect = (answer: string) => {
    const currentCase = testSession?.cases[currentCaseIndex]
    if (!currentCase) return

    setResponses(prev => ({
      ...prev,
      [currentCase.id]: answer
    }))
  }

  const nextCase = async () => {
    if (!testSession) return

    const currentCase = testSession.cases[currentCaseIndex]
    const timeSpent = Math.floor((Date.now() - caseStartTime) / 1000)
    const selectedAnswer = responses[currentCase.id]

    if (!selectedAnswer) {
      alert('Please select an answer before proceeding.')
      return
    }

    // Save response to database
    await saveResponse(currentCase.id, selectedAnswer, timeSpent)

    if (currentCaseIndex < testSession.cases.length - 1) {
      setCurrentCaseIndex(currentCaseIndex + 1)
      setCaseStartTime(Date.now())
    } else {
      // Test completed
      await completeTest()
    }
  }

  const previousCase = () => {
    if (currentCaseIndex > 0) {
      setCurrentCaseIndex(currentCaseIndex - 1)
      setCaseStartTime(Date.now())
    }
  }

  const saveResponse = async (caseId: string, answer: string, timeSpent: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('case_responses')
        .upsert({
          user_id: user.id,
          case_id: caseId,
          selected_answer: answer,
          time_spent_seconds: timeSpent
        })
    } catch (error) {
      console.error('Error saving response:', error)
    }
  }

  const completeTest = async () => {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mark assignment as completed
      await supabase
        .from('user_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('test_session_id', params.testId)

      router.push(`/test/${params.testId}/completed`)
    } catch (error) {
      console.error('Error completing test:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test session...</p>
        </div>
      </div>
    )
  }

  if (!testSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Not Found</h2>
          <p className="text-gray-600">The requested test session could not be loaded.</p>
        </div>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{testSession.title}</h1>
              <p className="text-gray-600">{testSession.description}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {testSession.instructions}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Test Details</h3>
                <ul className="text-blue-800 space-y-1">
                  <li>• {testSession.cases.length} cases to evaluate</li>
                  <li>• No time limit per case</li>
                  <li>• You can navigate between cases</li>
                  <li>• All responses are automatically saved</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 p-6 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Viewer Controls</h3>
                <ul className="text-amber-800 space-y-1">
                  <li>• Mouse wheel: Zoom in/out</li>
                  <li>• Click and drag: Pan the image</li>
                  <li>• Navigator: Quick navigation</li>
                  <li>• Controls: Additional options</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={startTest}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentCase = testSession.cases[currentCaseIndex]
  const isAnswered = responses[currentCase.id]
  const progress = ((currentCaseIndex + 1) / testSession.cases.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">{testSession.title}</h1>
              <div className="text-sm text-gray-500">
                Case {currentCaseIndex + 1} of {testSession.cases.length}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>No time limit</span>
              </div>
              
              {isAnswered && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Answered</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          {/* WSI Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{currentCase.title}</h2>
              </div>
              <div className="p-4 h-[calc(100%-80px)]">
                <WSIViewer
                  slidePath={currentCase.slide_path}
                  slideWidth={currentCase.slide_width}
                  slideHeight={currentCase.slide_height}
                  maxLevel={currentCase.max_level}
                  height="100%"
                />
              </div>
            </div>
          </div>

          {/* Question Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-6 flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Question</h3>
                <p className="text-gray-700 mb-6 leading-relaxed">{currentCase.question}</p>
                
                <div className="space-y-3">
                  {currentCase.choices.map((choice, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        responses[currentCase.id] === choice
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`case-${currentCase.id}`}
                        value={choice}
                        checked={responses[currentCase.id] === choice}
                        onChange={(e) => handleAnswerSelect(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        responses[currentCase.id] === choice
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-gray-300'
                      }`}>
                        {responses[currentCase.id] === choice && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-gray-900 font-medium">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <button
                    onClick={previousCase}
                    disabled={currentCaseIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={nextCase}
                    disabled={!isAnswered || submitting}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>
                      {currentCaseIndex === testSession.cases.length - 1 ? 'Complete Test' : 'Next Case'}
                    </span>
                    {currentCaseIndex < testSession.cases.length - 1 && (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
