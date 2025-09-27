// src/app/admin/test/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Save, 
  Eye,
  AlertCircle,
  CheckCircle,
  FileImage,
  Trash2
} from 'lucide-react'
import WSIViewer from '@/components/WSIViewer'

interface TestCase {
  id: string
  title: string
  question: string
  choices: string[]
  correctAnswer: string
  slideFile?: File
  slidePath?: string
  slideWidth: number
  slideHeight: number
  maxLevel: number
  caseOrder: number
}

interface TestSession {
  title: string
  description: string
  instructions: string
  cases: TestCase[]
}

export default function CreateTestPage() {
  const router = useRouter()
  const [testSession, setTestSession] = useState<TestSession>({
    title: '',
    description: '',
    instructions: '',
    cases: []
  })
  const [currentStep, setCurrentStep] = useState<'basic' | 'cases' | 'preview'>('basic')
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [availableSlides, setAvailableSlides] = useState<{ id: string; slide_path: string; slide_name: string; slide_width: number; slide_height: number; max_level: number }[]>([])

  useEffect(() => {
    if (editingCase) {
      loadAvailableSlides()
    }
  }, [editingCase])

  const loadAvailableSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('slide_library')
        .select('*')
        .order('upload_date', { ascending: false })
      
      if (error) throw error
      setAvailableSlides(data || [])
    } catch (error) {
      console.error('Error loading slides:', error)
      setAvailableSlides([])
    }
  }

  const createNewCase = (): TestCase => ({
    id: Math.random().toString(36).substr(2, 9),
    title: '',
    question: '',
    choices: ['', '', '', ''],
    correctAnswer: '',
    slideWidth: 119040,
    slideHeight: 25344,
    maxLevel: 9,
    caseOrder: testSession.cases.length + 1
  })

  const validateBasicInfo = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!testSession.title.trim()) {
      newErrors.title = 'Test title is required'
    }
    
    if (!testSession.description.trim()) {
      newErrors.description = 'Test description is required'
    }
    
    if (!testSession.instructions.trim()) {
      newErrors.instructions = 'Test instructions are required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateCase = (testCase: TestCase): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!testCase.title.trim()) {
      newErrors.caseTitle = 'Case title is required'
    }
    
    if (!testCase.question.trim()) {
      newErrors.caseQuestion = 'Question is required'
    }
    
    const validChoices = testCase.choices.filter(choice => choice.trim())
    if (validChoices.length < 2) {
      newErrors.caseChoices = 'At least 2 answer choices are required'
    }
    
    if (!testCase.correctAnswer.trim() || !testCase.choices.includes(testCase.correctAnswer)) {
      newErrors.correctAnswer = 'Must select a valid correct answer'
    }
    
    if (!testCase.slidePath) {
      newErrors.slideFile = 'Please select a slide'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addCase = () => {
    const newCase = createNewCase()
    setEditingCase(newCase)
    setErrors({})
  }

  const saveCase = () => {
    if (!editingCase || !validateCase(editingCase)) return
    
    const existingCaseIndex = testSession.cases.findIndex(c => c.id === editingCase.id)
    
    setTestSession(prev => ({
      ...prev,
      cases: existingCaseIndex >= 0 
        ? prev.cases.map((c, i) => i === existingCaseIndex ? editingCase : c)
        : [...prev.cases, editingCase]
    }))
    
    setEditingCase(null)
    setErrors({})
  }

  const editCase = (caseToEdit: TestCase) => {
    setEditingCase({ ...caseToEdit })
    setErrors({})
  }

  const deleteCase = (caseId: string) => {
    setTestSession(prev => ({
      ...prev,
      cases: prev.cases.filter(c => c.id !== caseId)
    }))
  }

  const saveTestSession = async () => {
    if (testSession.cases.length === 0) {
      setErrors({ cases: 'At least one case is required' })
      return
    }
    
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Save test session
      const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .insert({
          title: testSession.title,
          description: testSession.description,
          instructions: testSession.instructions,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Save cases
      const casesToInsert = testSession.cases.map(testCase => ({
        test_session_id: session.id,
        case_number: testCase.caseOrder,
        title: testCase.title,
        question: testCase.question,
        choices: testCase.choices.filter(choice => choice.trim()),
        correct_answer: testCase.correctAnswer,
        slide_url: testCase.slidePath || '',
        case_order: testCase.caseOrder
      }))

      const { error: casesError } = await supabase
        .from('cases')
        .insert(casesToInsert)

      if (casesError) throw casesError

      router.push(`/admin/test/${session.id}/assign`)
      
    } catch (error) {
      console.error('Error saving test session:', error)
      setErrors({ save: 'Failed to save test session. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Create New Test Session</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentStep === 'preview' && (
                <button
                  onClick={saveTestSession}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Publish Test'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { id: 'basic', label: 'Basic Information', icon: '1' },
              { id: 'cases', label: 'Test Cases', icon: '2' },
              { id: 'preview', label: 'Preview & Publish', icon: '3' }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step.id 
                    ? 'border-indigo-600 bg-indigo-600 text-white' 
                    : index < ['basic', 'cases', 'preview'].indexOf(currentStep)
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {index < ['basic', 'cases', 'preview'].indexOf(currentStep) ? 
                    <CheckCircle className="h-5 w-5" /> : 
                    <span className="font-medium">{step.icon}</span>
                  }
                </div>
                <span className={`ml-3 font-medium ${
                  currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 2 && (
                  <div className={`ml-8 w-16 h-0.5 ${
                    index < ['basic', 'cases', 'preview'].indexOf(currentStep) 
                      ? 'bg-green-600' 
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Basic Information Step */}
        {currentStep === 'basic' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Session Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Title *
                  </label>
                  <input
                    type="text"
                    value={testSession.title}
                    onChange={(e) => setTestSession(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Dermatopathology Assessment - Q1 2025"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={testSession.description}
                    onChange={(e) => setTestSession(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Brief description of the test session purpose and content..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions for Pathologists *
                  </label>
                  <textarea
                    value={testSession.instructions}
                    onChange={(e) => setTestSession(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.instructions ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Detailed instructions for pathologists taking this test..."
                  />
                  {errors.instructions && (
                    <p className="mt-1 text-sm text-red-600">{errors.instructions}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => {
                    if (validateBasicInfo()) {
                      setCurrentStep('cases')
                    }
                  }}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Continue to Cases
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Cases Step */}
        {currentStep === 'cases' && (
          <div>
            {!editingCase ? (
              <div>
                {/* Cases List */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Test Cases ({testSession.cases.length})</h2>
                    <button
                      onClick={addCase}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Case</span>
                    </button>
                  </div>

                  {testSession.cases.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                      <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No cases added yet</h3>
                      <p className="text-gray-600 mb-6">Start by adding your first test case with a slide image and question.</p>
                      <button
                        onClick={addCase}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Add First Case
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testSession.cases.map((testCase, index) => (
                        <div key={testCase.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Case {index + 1}: {testCase.title}
                              </h3>
                              <p className="text-gray-600 mb-4">{testCase.question}</p>
                              <div className="text-sm text-gray-500">
                                <span>{testCase.choices.filter(c => c.trim()).length} answer choices</span>
                                {testCase.slidePath && (
                                  <span className="ml-4">• Slide uploaded</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => editCase(testCase)}
                                className="text-indigo-600 hover:text-indigo-900 px-3 py-1 rounded-md text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCase(testCase.id)}
                                className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('basic')}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    Back to Basic Info
                  </button>
                  <button
                    onClick={() => {
                      if (testSession.cases.length > 0) {
                        setCurrentStep('preview')
                      } else {
                        setErrors({ cases: 'At least one case is required' })
                      }
                    }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Preview Test
                  </button>
                </div>
                
                {errors.cases && (
                  <p className="mt-4 text-sm text-red-600 text-center">{errors.cases}</p>
                )}
              </div>
            ) : (
              /* Case Editor */
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Case Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">
                    {testSession.cases.find(c => c.id === editingCase.id) ? 'Edit Case' : 'New Case'}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Case Title *
                      </label>
                      <input
                        type="text"
                        value={editingCase.title}
                        onChange={(e) => setEditingCase(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.caseTitle ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Melanocytic Lesion - Case A"
                      />
                      {errors.caseTitle && (
                        <p className="mt-1 text-sm text-red-600">{errors.caseTitle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <textarea
                        value={editingCase.question}
                        onChange={(e) => setEditingCase(prev => prev ? { ...prev, question: e.target.value } : null)}
                        rows={4}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.caseQuestion ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="What is your diagnosis based on the histological features shown?"
                      />
                      {errors.caseQuestion && (
                        <p className="mt-1 text-sm text-red-600">{errors.caseQuestion}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Choices *
                      </label>
                      <div className="space-y-3">
                        {editingCase.choices.map((choice, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-500 w-6">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <input
                              type="text"
                              value={choice}
                              onChange={(e) => {
                                const newChoices = [...editingCase.choices]
                                newChoices[index] = e.target.value
                                setEditingCase(prev => prev ? { ...prev, choices: newChoices } : null)
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder={`Answer choice ${String.fromCharCode(65 + index)}`}
                            />
                          </div>
                        ))}
                      </div>
                      {errors.caseChoices && (
                        <p className="mt-1 text-sm text-red-600">{errors.caseChoices}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer *
                      </label>
                      <select
                        value={editingCase.correctAnswer}
                        onChange={(e) => setEditingCase(prev => prev ? { ...prev, correctAnswer: e.target.value } : null)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.correctAnswer ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select correct answer...</option>
                        {editingCase.choices.filter(choice => choice.trim()).map((choice, index) => (
                          <option key={index} value={choice}>
                            {String.fromCharCode(65 + index)}. {choice}
                          </option>
                        ))}
                      </select>
                      {errors.correctAnswer && (
                        <p className="mt-1 text-sm text-red-600">{errors.correctAnswer}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Slide *
                      </label>
                      <select
                        value={editingCase.slidePath || ''}
                        onChange={(e) => {
                          const selectedSlide = availableSlides.find(s => s.slide_path === e.target.value)
                          if (selectedSlide && editingCase) {
                            setEditingCase({
                              ...editingCase,
                              slidePath: selectedSlide.slide_path,
                              slideWidth: selectedSlide.slide_width,
                              slideHeight: selectedSlide.slide_height,
                              maxLevel: selectedSlide.max_level
                            })
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.slideFile ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Choose a slide...</option>
                        {availableSlides.map(slide => (
                          <option key={slide.id} value={slide.slide_path}>
                            {slide.slide_name} ({slide.slide_width}x{slide.slide_height})
                          </option>
                        ))}
                      </select>
                      {availableSlides.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500">No slides available. Upload slides to S3 first.</p>
                      )}
                      {errors.slideFile && (
                        <p className="mt-1 text-sm text-red-600">{errors.slideFile}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => {
                        setEditingCase(null)
                        setErrors({})
                      }}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCase}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Save Case
                    </button>
                  </div>
                </div>

                {/* Slide Preview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Slide Preview</h3>
                  
                  {editingCase.slidePath ? (
                    <div className="h-96">
                      <WSIViewer
                        slidePath={editingCase.slidePath}
                        slideWidth={editingCase.slideWidth}
                        slideHeight={editingCase.slideHeight}
                        maxLevel={editingCase.maxLevel}
                        height="100%"
                      />
                    </div>
                  ) : (
                    <div className="h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Upload a slide to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Step */}
        {currentStep === 'preview' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Session Preview</h2>
              
              <div className="space-y-8">
                {/* Test Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Information</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <dl className="grid grid-cols-1 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Title</dt>
                        <dd className="text-lg text-gray-900">{testSession.title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-gray-900">{testSession.description}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Instructions</dt>
                        <dd className="text-gray-900 whitespace-pre-line">{testSession.instructions}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Cases Summary */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Test Cases ({testSession.cases.length})
                  </h3>
                  <div className="space-y-4">
                    {testSession.cases.map((testCase, index) => (
                      <div key={testCase.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              Case {index + 1}: {testCase.title}
                            </h4>
                            <p className="text-gray-600 mt-2">{testCase.question}</p>
                            <div className="mt-3">
                              <span className="text-sm text-gray-500">
                                {testCase.choices.filter(c => c.trim()).length} choices
                              </span>
                              <span className="ml-4 text-sm text-green-600">
                                Correct: {testCase.correctAnswer}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {testCase.slidePath ? (
                              <span className="text-green-600 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Slide Ready
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                No Slide
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep('cases')}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Back to Cases
                </button>
                <button
                  onClick={saveTestSession}
                  disabled={saving}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? 'Publishing Test...' : 'Publish Test Session'}</span>
                </button>
              </div>

              {errors.save && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-700">{errors.save}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
