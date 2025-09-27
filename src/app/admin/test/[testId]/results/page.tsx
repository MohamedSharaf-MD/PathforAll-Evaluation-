'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft,
  Download,
  Eye,
  User,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  FileText,
  Calendar,
  Filter,
  Search
} from 'lucide-react'

interface TestResult {
  id: string
  user_id: string
  test_session_id: string
  user_name: string
  user_email: string
  user_specialty?: string
  user_institution?: string
  test_title: string
  test_description: string
  status: 'pending' | 'in_progress' | 'completed'
  assigned_at: string
  completed_at?: string
  total_cases: number
  completed_cases: number
  correct_answers: number
  accuracy_percentage: number
  total_time_minutes: number
  average_time_per_case: number
}

interface CaseResponse {
  id: string
  case_id: string
  case_title: string
  case_number: number
  user_answer: string
  correct_answer: string
  is_correct: boolean
  time_spent_seconds: number
  answered_at: string
}

interface TestSession {
  id: string
  title: string
  description: string
  created_at: string
  case_count: number
}

export default function TestResultsPage() {
  const router = useRouter()
  const params = useParams()
  const testId = params.testId as string
  
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [caseResponses, setCaseResponses] = useState<CaseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'accuracy' | 'time' | 'status'>('name')

  useEffect(() => {
    checkAdminAccess()
    loadTestResults()
  }, [testId])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/login')
    }
  }

  const loadTestResults = async () => {
    try {
      // Load test session info
      const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', testId)
        .single()

      if (sessionError) throw sessionError
      setTestSession(session)

      // Load all assignments for this test
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_assignments')
        .select(`
          *,
          user_profiles!inner(
            id,
            full_name,
            email,
            specialty,
            institution
          )
        `)
        .eq('test_session_id', testId)
        .order('assigned_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Load case responses for all users
      const userIds = assignments?.map(a => a.user_id) || []
      const { data: responses, error: responsesError } = await supabase
        .from('case_responses')
        .select(`
          *,
          cases!inner(
            id,
            title,
            case_number,
            correct_answer
          )
        `)
        .in('user_id', userIds)
        .eq('cases.test_session_id', testId)

      if (responsesError) throw responsesError

      // Load case count for this test
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('test_session_id', testId)

      if (casesError) throw casesError
      const totalCases = cases?.length || 0

      // Create responses map by user
      const responsesMap = new Map()
      responses?.forEach(response => {
        const userId = response.user_id
        if (!responsesMap.has(userId)) {
          responsesMap.set(userId, [])
        }
        responsesMap.get(userId).push({
          id: response.id,
          case_id: response.case_id,
          case_title: response.cases?.title || 'Untitled Case',
          case_number: response.cases?.case_number || 0,
          user_answer: response.selected_answer,
          correct_answer: response.cases?.correct_answer || '',
          is_correct: response.selected_answer === response.cases?.correct_answer,
          time_spent_seconds: response.time_spent_seconds,
          answered_at: response.created_at
        })
      })

      // Transform assignments to test results
      const results: TestResult[] = assignments?.map(assignment => {
        const userResponses = responsesMap.get(assignment.user_id) || []
        const correctAnswers = userResponses.filter((r: { is_correct: boolean }) => r.is_correct).length
        const totalTimeSeconds = userResponses.reduce((sum: number, r: { time_spent_seconds: number }) => sum + r.time_spent_seconds, 0)
        const totalTimeMinutes = Math.round(totalTimeSeconds / 60)
        const averageTimePerCase = userResponses.length > 0 ? Math.round(totalTimeSeconds / userResponses.length) : 0
        const accuracyPercentage = userResponses.length > 0 ? Math.round((correctAnswers / userResponses.length) * 100) : 0

        return {
          id: assignment.id,
          user_id: assignment.user_id,
          test_session_id: assignment.test_session_id,
          user_name: assignment.user_profiles?.full_name || 'Unknown User',
          user_email: assignment.user_profiles?.email || 'N/A',
          user_specialty: assignment.user_profiles?.specialty,
          user_institution: assignment.user_profiles?.institution,
          test_title: session.title,
          test_description: session.description,
          status: assignment.status as 'pending' | 'in_progress' | 'completed',
          assigned_at: assignment.assigned_at,
          completed_at: assignment.completed_at,
          total_cases: totalCases,
          completed_cases: userResponses.length,
          correct_answers: correctAnswers,
          accuracy_percentage: accuracyPercentage,
          total_time_minutes: totalTimeMinutes,
          average_time_per_case: averageTimePerCase
        }
      }) || []

      setTestResults(results)
    } catch (error) {
      console.error('Error loading test results:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCaseResponses = async (result: TestResult) => {
    setLoadingDetails(true)
    try {
      const { data: responses, error } = await supabase
        .from('case_responses')
        .select(`
          *,
          cases!inner(
            id,
            title,
            case_number,
            correct_answer
          )
        `)
        .eq('user_id', result.user_id)
        .eq('cases.test_session_id', testId)
        .order('cases.case_number')

      if (error) throw error

      const transformedResponses: CaseResponse[] = responses?.map(response => ({
        id: response.id,
        case_id: response.case_id,
        case_title: response.cases?.title || 'Untitled Case',
        case_number: response.cases?.case_number || 0,
        user_answer: response.selected_answer,
        correct_answer: response.cases?.correct_answer || '',
        is_correct: response.selected_answer === response.cases?.correct_answer,
        time_spent_seconds: response.time_spent_seconds,
        answered_at: response.created_at
      })) || []

      setCaseResponses(transformedResponses)
      setSelectedResult(result)
    } catch (error) {
      console.error('Error loading case responses:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const exportResults = () => {
    if (!testResults || testResults.length === 0) {
      alert('No test results available to export.')
      return
    }

    try {
      const csvData = testResults.map(result => ({
        'User Name': result.user_name,
        'Email': result.user_email,
        'Specialty': result.user_specialty || 'N/A',
        'Institution': result.user_institution || 'N/A',
        'Status': result.status,
        'Completed Cases': result.completed_cases,
        'Total Cases': result.total_cases,
        'Correct Answers': result.correct_answers,
        'Accuracy %': result.accuracy_percentage,
        'Total Time (min)': result.total_time_minutes,
        'Avg Time per Case (sec)': result.average_time_per_case,
        'Assigned At': new Date(result.assigned_at).toLocaleString('en-US', { timeZone: 'America/New_York' }),
        'Completed At': result.completed_at ? new Date(result.completed_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A'
      }))

      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map((row: Record<string, string | number>) => headers.map((header: string) => `"${row[header]}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-results-${testSession?.title?.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredResults = testResults.filter(result => {
    const matchesSearch = result.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.user_specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.user_institution?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'accuracy':
        return b.accuracy_percentage - a.accuracy_percentage
      case 'time':
        return a.total_time_minutes - b.total_time_minutes
      case 'status':
        return b.completed_cases - a.completed_cases
      default:
        return a.user_name.localeCompare(b.user_name)
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Admin</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
                <p className="text-sm text-gray-500">{testSession?.title}</p>
              </div>
            </div>
            <button
              onClick={exportResults}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'in_progress' | 'pending')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'accuracy' | 'time' | 'status')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Sort by Name</option>
              <option value="accuracy">Sort by Accuracy</option>
              <option value="time">Sort by Time</option>
              <option value="completed">Sort by Completed Cases</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Results ({sortedResults.length} pathologists)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pathologist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{result.user_name}</div>
                          <div className="text-sm text-gray-500">{result.user_email}</div>
                          {result.user_specialty && (
                            <div className="text-xs text-gray-400">{result.user_specialty}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                          {result.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.completed_cases}/{result.total_cases} cases
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(result.completed_cases / result.total_cases) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.accuracy_percentage}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.correct_answers}/{result.completed_cases} correct
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {result.total_time_minutes} min total
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(result.average_time_per_case)} avg/case
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => loadCaseResponses(result)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Case Details Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Detailed Results: {selectedResult.user_name}
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              {loadingDetails ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading case details...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{selectedResult.accuracy_percentage}%</div>
                      <div className="text-sm text-gray-500">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedResult.correct_answers}</div>
                      <div className="text-sm text-gray-500">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{selectedResult.completed_cases - selectedResult.correct_answers}</div>
                      <div className="text-sm text-gray-500">Incorrect</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedResult.total_time_minutes}</div>
                      <div className="text-sm text-gray-500">Minutes</div>
                    </div>
                  </div>

                  {/* Case Responses */}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {caseResponses.map((response) => (
                          <tr key={response.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              Case {response.case_number}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {response.user_answer}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {response.is_correct ? (
                                <span className="text-green-600 font-medium">✓ Correct</span>
                              ) : (
                                <span className="text-red-600 font-medium">✗ Incorrect</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatTime(response.time_spent_seconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
