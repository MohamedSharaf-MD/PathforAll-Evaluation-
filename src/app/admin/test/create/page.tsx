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
  AlertCircle,
  CheckCircle,
  FileImage,
  Microscope
} from 'lucide-react'
import WSIViewer from '@/components/WSIViewer'

interface TestCase {
  id: string
  title: string
  question: string
  choices: string[]
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
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateCase, setTemplateCase] = useState<TestCase | null>(null)
  const [selectedSlidesForTemplate, setSelectedSlidesForTemplate] = useState<string[]>([])

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

  const openTemplateModal = () => {
    if (testSession.cases.length === 0) {
      setErrors({ template: 'Please create at least one case first to use as a template' })
      return
    }
    setShowTemplateModal(true)
    setTemplateCase(null)
    setSelectedSlidesForTemplate([])
  }

  const createCasesFromTemplate = () => {
    if (!templateCase || selectedSlidesForTemplate.length === 0) {
      setErrors({ template: 'Please select a template case and at least one slide' })
      return
    }

    const newCases: TestCase[] = selectedSlidesForTemplate.map((slidePath, index) => {
      const selectedSlide = availableSlides.find(s => s.slide_path === slidePath)
      return {
        ...templateCase,
        id: Math.random().toString(36).substr(2, 9),
        slidePath: slidePath,
        slideWidth: selectedSlide?.slide_width || 119040,
        slideHeight: selectedSlide?.slide_height || 25344,
        maxLevel: selectedSlide?.max_level || 9,
        caseOrder: testSession.cases.length + index + 1,
        title: `${templateCase.title} - Case ${testSession.cases.length + index + 1}`
      }
    })

    setTestSession(prev => ({
      ...prev,
      cases: [...prev.cases, ...newCases]
    }))

    setShowTemplateModal(false)
    setTemplateCase(null)
    setSelectedSlidesForTemplate([])
    setErrors({})
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Microscope className="h-6 w-6 text-teal-500" />
              <h1 className="text-xl font-semibold text-white">Create New Test Session</h1>
            </div>

            <div className="flex items-center space-x-4">
              {currentStep === 'preview' && (
                <button
                  onClick={saveTestSession}
                  disabled={saving}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
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
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep === step.id
                    ? 'border-teal-500 bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                    : index < ['basic', 'cases', 'preview'].indexOf(currentStep)
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-300'
                }`}>
                  {index < ['basic', 'cases', 'preview'].indexOf(currentStep) ?
                    <CheckCircle className="h-5 w-5" /> :
                    <span className="font-medium">{step.icon}</span>
                  }
                </div>
                <span className={`ml-3 font-medium transition-colors ${
                  currentStep === step.id ? 'text-teal-400' : index < ['basic', 'cases', 'preview'].indexOf(currentStep) ? 'text-teal-500' : 'text-slate-300'
                }`}>
                  {step.label}
                </span>
                {index < 2 && (
                  <div className={`ml-8 w-16 h-0.5 transition-colors ${
                    index < ['basic', 'cases', 'preview'].indexOf(currentStep)
                      ? 'bg-teal-500'
                      : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Basic Information Step */}
        {currentStep === 'basic' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Test Session Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Test Title *
                  </label>
                  <input
                    type="text"
                    value={testSession.title}
                    onChange={(e) => setTestSession(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                      errors.title ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="e.g., Dermatopathology Assessment - Q1 2025"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={testSession.description}
                    onChange={(e) => setTestSession(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                      errors.description ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Brief description of the test session purpose and content..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Instructions for Pathologists *
                  </label>
                  <textarea
                    value={testSession.instructions}
                    onChange={(e) => setTestSession(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={6}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                      errors.instructions ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Detailed instructions for pathologists taking this test..."
                  />
                  {errors.instructions && (
                    <p className="mt-1 text-sm text-red-400">{errors.instructions}</p>
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
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all"
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
                    <h2 className="text-2xl font-bold text-white">Test Cases ({testSession.cases.length})</h2>
                    <div className="flex space-x-3">
                      {testSession.cases.length > 0 && (
                        <button
                          onClick={openTemplateModal}
                          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create from Template</span>
                        </button>
                      )}
                      <button
                        onClick={addCase}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Case</span>
                      </button>
                    </div>
                  </div>

                  {testSession.cases.length === 0 ? (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-12 text-center">
                      <FileImage className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No cases added yet</h3>
                      <p className="text-slate-300 mb-6">Start by adding your first test case with a slide image and question.</p>
                      <button
                        onClick={addCase}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all"
                      >
                        Add First Case
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testSession.cases.map((testCase, index) => (
                        <div key={testCase.id} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 hover:border-teal-500/30 rounded-xl p-6 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-white mb-2">
                                Case {index + 1}: {testCase.title}
                              </h3>
                              <p className="text-slate-300 mb-4">{testCase.question}</p>
                              <div className="text-sm text-slate-300">
                                <span>{testCase.choices.filter(c => c.trim()).length} answer choices</span>
                                {testCase.slidePath && (
                                  <span className="ml-4">• Slide uploaded</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => editCase(testCase)}
                                className="text-teal-400 hover:text-teal-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCase(testCase.id)}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-md text-sm font-medium transition-colors"
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
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
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
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all"
                  >
                    Preview Test
                  </button>
                </div>

                {errors.cases && (
                  <p className="mt-4 text-sm text-red-400 text-center">{errors.cases}</p>
                )}

                {errors.template && (
                  <p className="mt-4 text-sm text-red-400 text-center">{errors.template}</p>
                )}
              </div>
            ) : (
              /* Case Editor */
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Case Form */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-6">
                    {testSession.cases.find(c => c.id === editingCase.id) ? 'Edit Case' : 'New Case'}
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Case Title *
                      </label>
                      <input
                        type="text"
                        value={editingCase.title}
                        onChange={(e) => setEditingCase(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                          errors.caseTitle ? 'border-red-500' : 'border-slate-700'
                        }`}
                        placeholder="e.g., Melanocytic Lesion - Case A"
                      />
                      {errors.caseTitle && (
                        <p className="mt-1 text-sm text-red-400">{errors.caseTitle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Question *
                      </label>
                      <textarea
                        value={editingCase.question}
                        onChange={(e) => setEditingCase(prev => prev ? { ...prev, question: e.target.value } : null)}
                        rows={4}
                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                          errors.caseQuestion ? 'border-red-500' : 'border-slate-700'
                        }`}
                        placeholder="What is your diagnosis based on the histological features shown?"
                      />
                      {errors.caseQuestion && (
                        <p className="mt-1 text-sm text-red-400">{errors.caseQuestion}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Answer Choices *
                      </label>
                      <div className="space-y-3">
                        {editingCase.choices.map((choice, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-300 w-6">
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
                              className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                              placeholder={`Answer choice ${String.fromCharCode(65 + index)}`}
                            />
                          </div>
                        ))}
                      </div>
                      {errors.caseChoices && (
                        <p className="mt-1 text-sm text-red-400">{errors.caseChoices}</p>
                      )}
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
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
                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                          errors.slideFile ? 'border-red-500' : 'border-slate-700'
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
                        <p className="mt-2 text-sm text-slate-300">No slides available. Upload slides to S3 first.</p>
                      )}
                      {errors.slideFile && (
                        <p className="mt-1 text-sm text-red-400">{errors.slideFile}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => {
                        setEditingCase(null)
                        setErrors({})
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCase}
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 transition-all"
                    >
                      Save Case
                    </button>
                  </div>
                </div>

                {/* Slide Preview */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-6">Slide Preview</h3>

                  {editingCase.slidePath ? (
                    <div className="h-96 rounded-lg overflow-hidden">
                      <WSIViewer
                        slidePath={editingCase.slidePath}
                        slideWidth={editingCase.slideWidth}
                        slideHeight={editingCase.slideHeight}
                        maxLevel={editingCase.maxLevel}
                        height="100%"
                      />
                    </div>
                  ) : (
                    <div className="h-96 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center bg-slate-900/30">
                      <div className="text-center">
                        <FileImage className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-300">Select a slide to see preview</p>
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
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Test Session Preview</h2>

              <div className="space-y-8">
                {/* Test Info */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Test Information</h3>
                  <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/50">
                    <dl className="grid grid-cols-1 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-slate-300">Title</dt>
                        <dd className="text-lg text-white mt-1">{testSession.title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-300">Description</dt>
                        <dd className="text-slate-300 mt-1">{testSession.description}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-300">Instructions</dt>
                        <dd className="text-slate-300 whitespace-pre-line mt-1">{testSession.instructions}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Cases Summary */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">
                    Test Cases ({testSession.cases.length})
                  </h3>
                  <div className="space-y-4">
                    {testSession.cases.map((testCase, index) => (
                      <div key={testCase.id} className="border border-slate-700/50 bg-slate-900/30 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">
                              Case {index + 1}: {testCase.title}
                            </h4>
                            <p className="text-slate-300 mt-2">{testCase.question}</p>
                            <div className="mt-3">
                              <span className="text-sm text-slate-300">
                                {testCase.choices.filter(c => c.trim()).length} choices
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-slate-300">
                            {testCase.slidePath ? (
                              <span className="text-teal-400 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Slide Ready
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center">
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
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Back to Cases
                </button>
                <button
                  onClick={saveTestSession}
                  disabled={saving}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? 'Publishing Test...' : 'Publish Test Session'}</span>
                </button>
              </div>

              {errors.save && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-400">{errors.save}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Cases from Template</h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Template Case *
                  </label>
                  <select
                    value={templateCase?.id || ''}
                    onChange={(e) => {
                      const selectedCase = testSession.cases.find(c => c.id === e.target.value)
                      setTemplateCase(selectedCase || null)
                    }}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  >
                    <option value="">Choose a template case...</option>
                    {testSession.cases.map(testCase => (
                      <option key={testCase.id} value={testCase.id}>
                        {testCase.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Preview */}
                {templateCase && (
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Template Preview</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-300"><strong className="text-slate-300">Title:</strong> {templateCase.title}</p>
                      <p className="text-slate-300"><strong className="text-slate-300">Question:</strong> {templateCase.question}</p>
                      <p className="text-slate-300"><strong className="text-slate-300">Choices:</strong> {templateCase.choices.filter(c => c.trim()).join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* Slide Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Slides for New Cases *
                  </label>
                  <div className="max-h-60 overflow-y-auto bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    {availableSlides.map(slide => (
                      <label key={slide.id} className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-slate-800/50 rounded px-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedSlidesForTemplate.includes(slide.slide_path)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSlidesForTemplate(prev => [...prev, slide.slide_path])
                            } else {
                              setSelectedSlidesForTemplate(prev => prev.filter(path => path !== slide.slide_path))
                            }
                          }}
                          className="h-4 w-4 text-teal-500 focus:ring-teal-500 border-slate-600 rounded bg-slate-900"
                        />
                        <span className="text-sm text-slate-300">
                          {slide.slide_name} ({slide.slide_width}x{slide.slide_height})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {selectedSlidesForTemplate.length} slide(s) selected
                  </p>
                </div>

                {errors.template && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {errors.template}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCasesFromTemplate}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-6 py-3 rounded-lg shadow-lg shadow-teal-500/25 transition-all flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create {selectedSlidesForTemplate.length} Cases</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
