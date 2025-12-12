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
  const [saving, setSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadTestSession()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Add beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedAnswers = Object.keys(responses).length > 0
      if (hasUnsavedAnswers && !submitting) {
        e.preventDefault()
        e.returnValue = 'You have unsaved answers. Are you sure you want to leave?'
        return 'You have unsaved answers. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [responses, submitting])

  const loadTestSession = async () => {
    try {
      // Load test session with cases and slide library data
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

      // Load slide library data for each case to get proper dimensions
      const slideUrls = session.cases.map((case_: { slide_url: string }) => case_.slide_url).filter(Boolean)
      const { data: slideLibrary, error: slideError } = await supabase
        .from('slide_library')
        .select('slide_path, slide_width, slide_height, max_level')
        .in('slide_path', slideUrls)

      if (slideError) {
        console.warn('Error loading slide library:', slideError)
      }

      // Create a map of slide paths to their dimensions
      const slideDimensions = new Map()
      slideLibrary?.forEach(slide => {
        slideDimensions.set(slide.slide_path, {
          slide_width: slide.slide_width,
          slide_height: slide.slide_height,
          max_level: slide.max_level
        })
      })

      // Transform the data to match our interface
      const transformedSession: TestSession = {
        ...session,
        cases: session.cases.map((case_: { slide_url: string; case_order: number; [key: string]: unknown }) => {
          const slidePath = case_.slide_url || ''
          const dimensions = slideDimensions.get(slidePath) || {
            slide_width: 119040,
            slide_height: 25344,
            max_level: 9
          }

          return {
            ...case_,
            slide_path: slidePath,
            slide_width: dimensions.slide_width,
            slide_height: dimensions.slide_height,
            max_level: dimensions.max_level
          }
        }).sort((a: { case_order: number }, b: { case_order: number }) => a.case_order - b.case_order)
      }

      setTestSession(transformedSession)
      setLoading(false)

      // Load existing responses after test session is set
      await loadExistingResponses(transformedSession)
    } catch (error) {
      console.error('Error loading test session:', error)
      setLoading(false)
    }
  }

  const loadExistingResponses = async (session: TestSession) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: responses, error } = await supabase
        .from('case_responses')
        .select('case_id, selected_answer')
        .eq('user_id', user.id)
        .in('case_id', session.cases.map(c => c.id))

      if (error) {
        console.warn('Error loading existing responses:', error)
        return
      }

      // Convert responses to the format expected by the component
      const responsesMap: Record<string, string> = {}
      responses?.forEach(response => {
        responsesMap[response.case_id] = response.selected_answer
      })

      setResponses(responsesMap)

      // Load saved progress
      const { data: progress, error: progressError } = await supabase
        .from('test_progress')
        .select('current_case_index')
        .eq('user_id', user.id)
        .eq('test_session_id', session.id)
        .single()

      if (!progressError && progress) {
        setCurrentCaseIndex(progress.current_case_index)
      }
    } catch (error) {
      console.warn('Error loading existing responses:', error)
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

    // Auto-save the response
    autoSaveResponse(currentCase.id, answer)
  }

  const saveProgress = async () => {
    try {
      setSavingProgress(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !testSession) return

      // Save current progress
      await supabase
        .from('test_progress')
        .upsert({
          user_id: user.id,
          test_session_id: testSession.id,
          current_case_index: currentCaseIndex,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,test_session_id'
        })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setSavingProgress(false)
    }
  }

  const autoSaveResponse = async (caseId: string, answer: string) => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate time spent on current case
      const timeSpent = Math.floor((Date.now() - caseStartTime) / 1000)

      await supabase
        .from('case_responses')
        .upsert({
          user_id: user.id,
          case_id: caseId,
          selected_answer: answer,
          time_spent_seconds: timeSpent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,case_id'
        })
    } catch (error) {
      console.error('Error auto-saving response:', error)
    } finally {
      setSaving(false)
    }
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading test session...</p>
        </div>
      </div>
    )
  }

  if (!testSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Test Not Found</h2>
          <p className="text-slate-300">The requested test session could not be loaded.</p>
        </div>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{testSession.title}</h1>
              <p className="text-slate-300">{testSession.description}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-line text-slate-300 leading-relaxed">
                  {testSession.instructions}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-teal-500/10 border border-teal-500/20 p-6 rounded-lg">
                <h3 className="font-semibold text-teal-400 mb-2">Test Details</h3>
                <ul className="text-teal-300 space-y-1">
                  <li>• {testSession.cases.length} cases to evaluate</li>
                  <li>• No time limit per case</li>
                  <li>• You can navigate between cases</li>
                  <li>• All responses are automatically saved</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-lg">
                <h3 className="font-semibold text-amber-400 mb-2">Viewer Controls</h3>
                <ul className="text-amber-300 space-y-1">
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
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-white">{testSession.title}</h1>
              <div className="text-sm text-slate-400">
                Case {currentCaseIndex + 1} of {testSession.cases.length}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                <span>No time limit</span>
              </div>

              {isAnswered && (
                <div className="flex items-center space-x-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Answered</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-700">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          {/* WSI Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl h-full flex flex-col">
              <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                <h2 className="text-lg font-medium text-white">{currentCase.title}</h2>
                {saving && (
                  <div className="flex items-center text-sm text-slate-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500 mr-2"></div>
                    Saving...
                  </div>
                )}
              </div>
              <div className="flex-1 p-4">
                <div className="bg-slate-900/50 rounded-lg h-full">
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
          </div>

          {/* Question Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl h-full flex flex-col">
              <div className="p-6 flex-1">
                <h3 className="text-lg font-medium text-white mb-4">Question</h3>
                <p className="text-slate-300 mb-6 leading-relaxed">{currentCase.question}</p>

                <div className="space-y-3">
                  {currentCase.choices.map((choice, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        responses[currentCase.id] === choice
                          ? 'border-teal-500 bg-teal-500/10'
                          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
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
                          ? 'border-teal-500 bg-teal-500'
                          : 'border-slate-600'
                      }`}>
                        {responses[currentCase.id] === choice && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-white font-medium">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="p-6 border-t border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={saveProgress}
                    disabled={savingProgress}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingProgress ? 'Saving...' : 'Save Progress'}
                  </button>

                  <span className="text-sm text-slate-500">
                    {currentCaseIndex + 1} of {testSession.cases.length}
                  </span>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={previousCase}
                    disabled={currentCaseIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={nextCase}
                    disabled={!isAnswered || submitting}
                    className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
