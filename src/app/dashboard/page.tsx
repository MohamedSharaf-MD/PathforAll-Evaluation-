'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  BarChart3,
  Play,
  Eye,
  LogOut
} from 'lucide-react'

interface AssignedTest {
  id: string
  test_session_id: string
  title: string
  description: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed'
  assigned_at: string
  completed_at?: string
  case_count: number
  completed_cases: number
  progress_percentage: number
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  specialty?: string
  institution?: string
  role: string
}

interface DashboardStats {
  totalAssigned: number
  pendingTests: number
  completedTests: number
  totalCases: number
  completedCases: number
}

export default function PathologistDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'history'>('overview')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser({ id: user.id, email: user.email || '' })
      
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        router.push('/login')
        return
      }

      setUserProfile(profile)
      
      // Redirect admin users to admin dashboard
      if (profile.role === 'admin') {
        router.push('/admin')
        return
      }

      await loadDashboardData(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async (userId: string) => {
    try {
      // Load assigned tests with progress
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_assignments')
        .select(`
          *,
          test_sessions!inner(
            id,
            title,
            description,
            cases(count)
          )
        `)
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Load completed cases count for each test
      const testSessionIds = assignments?.map(a => a.test_session_id) || []
      const { data: completedCases, error: casesError } = await supabase
        .from('case_responses')
        .select(`
          cases!inner(test_session_id)
        `)
        .eq('user_id', userId)
        .in('cases.test_session_id', testSessionIds)

      if (casesError) throw casesError

      // Create completed cases map
      const completedMap = new Map()
      completedCases?.forEach((response: { cases: { test_session_id: string }[] }) => {
        response.cases.forEach(case_ => {
          const testId = case_.test_session_id
          if (testId) {
            const count = completedMap.get(testId) || 0
            completedMap.set(testId, count + 1)
          }
        })
      })

      // Transform assignments data
      const transformedTests: AssignedTest[] = assignments?.map(assignment => {
        const completedCasesCount = completedMap.get(assignment.test_session_id) || 0
        const totalCases = assignment.test_sessions?.cases?.length || 0
        const progressPercentage = totalCases > 0 ? Math.round((completedCasesCount / totalCases) * 100) : 0
        
        return {
          id: assignment.id,
          test_session_id: assignment.test_session_id,
          title: assignment.test_sessions?.title || 'Untitled Test',
          description: assignment.test_sessions?.description || '',
          status: assignment.status as 'pending' | 'in_progress' | 'completed',
          assigned_at: assignment.assigned_at,
          completed_at: assignment.completed_at,
          case_count: totalCases,
          completed_cases: completedCasesCount,
          progress_percentage: progressPercentage
        }
      }) || []

      setAssignedTests(transformedTests)

      // Calculate stats
      const stats: DashboardStats = {
        totalAssigned: transformedTests.length,
        pendingTests: transformedTests.filter(t => t.status === 'pending' || t.status === 'assigned').length,
        completedTests: transformedTests.filter(t => t.status === 'completed').length,
        totalCases: transformedTests.reduce((sum, t) => sum + t.case_count, 0),
        completedCases: transformedTests.reduce((sum, t) => sum + t.completed_cases, 0)
      }

      setStats(stats)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleStartTest = (testSessionId: string) => {
    router.push(`/test/${testSessionId}`)
  }

  const handleViewResults = (testSessionId: string) => {
    router.push(`/test/${testSessionId}/completed`)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if there's an error
      router.push('/')
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">PathforAll</h1>
              <span className="text-sm text-gray-500">Pathologist Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500">{userProfile?.specialty || 'Pathologist'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'tests', label: 'My Tests', icon: FileText },
              { id: 'history', label: 'History', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'tests' | 'history')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Assigned</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalAssigned}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Tests</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.pendingTests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completed Tests</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completedTests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cases Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completedCases}/{stats.totalCases}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Tests</h3>
              </div>
              <div className="p-6">
                {assignedTests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tests assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedTests.slice(0, 5).map(test => (
                      <div key={test.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(test.status)}
                          <div>
                            <h4 className="font-medium text-gray-900">{test.title}</h4>
                            <p className="text-sm text-gray-500">{test.case_count} cases • {test.progress_percentage}% complete</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                            {test.status.replace('_', ' ')}
                          </span>
                          {(test.status === 'pending' || test.status === 'assigned') && (
                            <button
                              onClick={() => handleStartTest(test.test_session_id)}
                              className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-sm"
                            >
                              <Play className="h-4 w-4" />
                              <span>Start</span>
                            </button>
                          )}
                          {test.status === 'in_progress' && (
                            <button
                              onClick={() => handleStartTest(test.test_session_id)}
                              className="flex items-center space-x-1 bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                            >
                              <Play className="h-4 w-4" />
                              <span>Continue</span>
                            </button>
                          )}
                          {test.status === 'completed' && (
                            <button
                              onClick={() => handleViewResults(test.test_session_id)}
                              className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">My Assigned Tests</h3>
            </div>
            <div className="p-6">
              {assignedTests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tests assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTests.map(test => (
                    <div key={test.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(test.status)}
                            <h4 className="text-lg font-medium text-gray-900">{test.title}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                              {test.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-4">{test.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Cases</p>
                              <p className="font-medium">{test.completed_cases}/{test.case_count}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Progress</p>
                              <p className="font-medium">{test.progress_percentage}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Assigned</p>
                              <p className="font-medium">{formatDate(test.assigned_at)}</p>
                            </div>
                            {test.completed_at && (
                              <div>
                                <p className="text-gray-500">Completed</p>
                                <p className="font-medium">{formatDate(test.completed_at)}</p>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{test.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${test.progress_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-6 flex flex-col space-y-2">
                          {(test.status === 'pending' || test.status === 'assigned') && (
                            <button
                              onClick={() => handleStartTest(test.test_session_id)}
                              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                            >
                              <Play className="h-4 w-4" />
                              <span>Start Test</span>
                            </button>
                          )}
                          {test.status === 'in_progress' && (
                            <button
                              onClick={() => handleStartTest(test.test_session_id)}
                              className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
                            >
                              <Play className="h-4 w-4" />
                              <span>Continue Test</span>
                            </button>
                          )}
                          {test.status === 'completed' && (
                            <button
                              onClick={() => handleViewResults(test.test_session_id)}
                              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View Results</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Test History</h3>
            </div>
            <div className="p-6">
              {assignedTests.filter(t => t.status === 'completed').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No completed tests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTests
                    .filter(t => t.status === 'completed')
                    .map(test => (
                      <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <h4 className="font-medium text-gray-900">{test.title}</h4>
                              <p className="text-sm text-gray-500">
                                Completed {test.completed_at && formatDate(test.completed_at)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewResults(test.test_session_id)}
                            className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Results</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
