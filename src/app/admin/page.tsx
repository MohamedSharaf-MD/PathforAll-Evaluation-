// src/app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Users, 
  FileText, 
  BarChart3, 
  Download,
  CheckCircle,
  Search
} from 'lucide-react'

interface TestSession {
  id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
  case_count: number
  assigned_users: number
  completed_responses: number
}

interface User {
  id: string
  full_name: string
  email: string
  specialty?: string
  institution?: string
  role: string
  created_at: string
}

interface DashboardStats {
  totalUsers: number
  activeTests: number
  completedTests: number
  totalResponses: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'users' | 'analytics'>('overview')
  const [testSessions, setTestSessions] = useState<TestSession[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkAdminAccess()
    loadDashboardData()
  }, [])

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

  const loadDashboardData = async () => {
    try {
      // Load test sessions with aggregated data
      const { data: sessions, error: sessionsError } = await supabase
        .from('test_sessions')
        .select(`
          *,
          cases(count),
          user_assignments(count)
        `)
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      // Load completed responses separately
      const sessionIds = sessions.map(s => s.id)
      const { data: completedResponses, error: responsesError } = await supabase
        .from('user_assignments')
        .select('test_session_id')
        .eq('status', 'completed')
        .in('test_session_id', sessionIds)

      if (responsesError) throw responsesError

      // Create a map of completed responses by session
      const completedMap = new Map()
      completedResponses?.forEach(response => {
        const count = completedMap.get(response.test_session_id) || 0
        completedMap.set(response.test_session_id, count + 1)
      })

      // Transform sessions data
      const transformedSessions: TestSession[] = sessions.map(session => ({
        id: session.id,
        title: session.title,
        description: session.description,
        is_active: session.is_active,
        created_at: session.created_at,
        case_count: session.cases?.length || 0,
        assigned_users: session.user_assignments?.length || 0,
        completed_responses: completedMap.get(session.id) || 0
      }))

      setTestSessions(transformedSessions)

      // Load users - using email column from user_profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      const transformedUsers: User[] = usersData.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email || 'N/A', // Use email column from user_profiles
        specialty: user.specialty,
        institution: user.institution,
        role: user.role,
        created_at: user.created_at
      }))

      setUsers(transformedUsers)

      // Calculate stats
      const stats: DashboardStats = {
        totalUsers: transformedUsers.filter(u => u.role === 'pathologist').length,
        activeTests: transformedSessions.filter(s => s.is_active).length,
        completedTests: transformedSessions.filter(s => !s.is_active).length,
        totalResponses: transformedSessions.reduce((sum, s) => sum + s.completed_responses, 0)
      }

      setStats(stats)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTestSessions = testSessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.institution?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportTestResults = async (testId: string) => {
    try {
      // Get assignments for this test (simplified query)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_assignments')
        .select('*')
        .eq('test_session_id', testId)

      if (assignmentsError) {
        console.error('Assignments error:', assignmentsError)
        throw assignmentsError
      }

      if (!assignments || assignments.length === 0) {
        alert('No test results available to export.')
        return
      }

      // Get user profiles separately
      const userIds = assignments.map((a: { user_id: string }) => a.user_id)
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds)

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        throw profilesError
      }

      // Get test session info
      const { data: testSession, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', testId)
        .single()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }

      // Get case responses for each user (not assignment)
      const responseUserIds = assignments.map((a: { user_id: string }) => a.user_id)
      
      const { data: responses, error: responsesError } = await supabase
        .from('case_responses')
        .select(`
          *,
          cases!inner(
            id,
            case_number,
            title,
            question,
            slide_url,
            test_session_id
          )
        `)
        .in('user_id', responseUserIds)
        .eq('cases.test_session_id', testId)

      if (responsesError) {
        console.error('Responses error:', responsesError)
        throw responsesError
      }

      // Get slide names from slide_library
      const slideUrls = responses?.map((r: { cases?: { slide_url: string } }) => r.cases?.slide_url).filter(Boolean) || []
      const { data: slideLibrary, error: slideError } = await supabase
        .from('slide_library')
        .select('slide_path, slide_name')
        .in('slide_path', slideUrls)

      if (slideError) {
        console.warn('Slide library error:', slideError)
      }

      // Create slide names map
      const slideNamesMap = new Map()
      slideLibrary?.forEach((slide: { slide_path: string; slide_name: string }) => {
        slideNamesMap.set(slide.slide_path, slide.slide_name)
      })

      // Create user profiles map
      const userProfilesMap = new Map()
      userProfiles?.forEach((profile: { id: string; full_name: string; email: string; specialty: string; institution: string }) => {
        userProfilesMap.set(profile.id, profile)
      })

      // Group responses by user (not assignment)
      const responsesByUser = new Map()
      responses?.forEach((response: { user_id: string; selected_answer: string; time_spent_seconds: number; cases?: { correct_answer: string } }) => {
        const userId = response.user_id
        if (!responsesByUser.has(userId)) {
          responsesByUser.set(userId, [])
        }
        responsesByUser.get(userId).push(response)
      })

      // Create detailed CSV data with individual case responses
      const csvData: Record<string, string | number>[] = []
      
      assignments.forEach((assignment: { user_id: string; status: string; assigned_at: string; completed_at: string }) => {
        const userProfile = userProfilesMap.get(assignment.user_id)
        const userResponses = responsesByUser.get(assignment.user_id) || []
        const totalCases = userResponses.length
        const totalTimeSeconds = userResponses.reduce((sum: number, r: { time_spent_seconds: number }) => sum + (r.time_spent_seconds || 0), 0)
        const totalTimeMinutes = Math.round(totalTimeSeconds / 60)

        // Add summary row
        const summaryRow = {
          'User Name': userProfile?.full_name || 'N/A',
          'Email': userProfile?.email || 'N/A',
          'Specialty': userProfile?.specialty || 'N/A',
          'Institution': userProfile?.institution || 'N/A',
          'Test Title': testSession?.title || 'N/A',
          'Status': assignment.status,
          'Completed Cases': totalCases,
          'Total Time (min)': totalTimeMinutes,
          'Assigned At': new Date(assignment.assigned_at).toLocaleString('en-US', { timeZone: 'America/New_York' }),
          'Completed At': assignment.completed_at ? new Date(assignment.completed_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A',
          'Case Number': 'SUMMARY',
          'Case Title': 'Overall Performance',
          'Slide Name': 'N/A',
          'Question': 'N/A',
          'Selected Answer': 'N/A',
          'Time Spent (sec)': 'N/A',
          'Time Spent (min)': 'N/A'
        }
        csvData.push(summaryRow)

        // Add individual case responses
        userResponses.forEach((response: { selected_answer: string; time_spent_seconds: number; cases?: { case_number: number; title: string; question: string; slide_url: string } }) => {
          const caseData = response.cases
          const timeMinutes = Math.round((response.time_spent_seconds || 0) / 60)
          const slideName = caseData?.slide_url ? slideNamesMap.get(caseData.slide_url) || 'N/A' : 'N/A'
          
          const caseRow = {
            'User Name': userProfile?.full_name || 'N/A',
            'Email': userProfile?.email || 'N/A',
            'Specialty': userProfile?.specialty || 'N/A',
            'Institution': userProfile?.institution || 'N/A',
            'Test Title': testSession?.title || 'N/A',
            'Status': assignment.status,
            'Completed Cases': totalCases,
            'Total Time (min)': totalTimeMinutes,
            'Assigned At': new Date(assignment.assigned_at).toLocaleString('en-US', { timeZone: 'America/New_York' }),
            'Completed At': assignment.completed_at ? new Date(assignment.completed_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A',
            'Case Number': caseData?.case_number || 'N/A',
            'Case Title': caseData?.title || 'N/A',
            'Slide Name': slideName,
            'Question': caseData?.question || 'N/A',
            'Selected Answer': response.selected_answer || 'N/A',
            'Time Spent (sec)': response.time_spent_seconds || 0,
            'Time Spent (min)': timeMinutes
          }
          csvData.push(caseRow)
        })

        // Add separator row between users
        if (assignment !== assignments[assignments.length - 1]) {
          csvData.push({
            'User Name': '',
            'Email': '',
            'Specialty': '',
            'Institution': '',
            'Test Title': '',
            'Status': '',
            'Completed Cases': '',
            'Total Time (min)': '',
            'Assigned At': '',
            'Completed At': '',
            'Case Number': '---',
            'Case Title': '---',
            'Slide Name': '---',
            'Question': '---',
            'Selected Answer': '---',
            'Time Spent (sec)': '---',
            'Time Spent (min)': '---'
          })
        }
      })

      // Generate CSV content
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map((row: Record<string, string | number>) => headers.map((header: string) => `"${row[header] || ''}"`).join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const testTitle = testSession?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'test'
      a.download = `detailed-test-results-${testTitle}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error exporting results:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">PathforAll Admin</h1>
              <span className="text-sm text-gray-500">Case Evaluation Management</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/test/create')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Test</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
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
              { id: 'tests', label: 'Test Sessions', icon: FileText },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'users')}
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
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Pathologists</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Tests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeTests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed Tests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedTests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Responses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalResponses}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Test Sessions</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {testSessions.slice(0, 5).map(session => (
                    <div key={session.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <h4 className="font-medium text-gray-900">{session.title}</h4>
                        <p className="text-sm text-gray-600">{session.description}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {session.completed_responses}/{session.assigned_users} completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Sessions Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="flex justify-between items-center">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search test sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <button
                onClick={() => router.push('/admin/test/create')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Test</span>
              </button>
            </div>

            {/* Test Sessions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTestSessions.map(session => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{session.title}</div>
                          <div className="text-sm text-gray-500">{session.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {session.case_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {session.assigned_users}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {session.completed_responses}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => router.push(`/admin/test/${session.id}/assign`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Assign Pathologists"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/test/${session.id}/results`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Results"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => exportTestResults(session.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Export Results"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                <Users className="h-4 w-4" />
                <span>Manage Users</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.specialty || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.institution || 'Not specified'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Detailed analytics and reporting features will be available in the next phase of development.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
