// src/app/admin/test/[testId]/assign/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Users, 
  Send, 
  Calendar,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Building,
  Stethoscope
} from 'lucide-react'

interface Pathologist {
  id: string
  full_name: string
  email: string
  specialty?: string
  institution?: string
  isAssigned: boolean
  assignmentStatus?: 'assigned' | 'in_progress' | 'completed'
  assignedAt?: string
  completedAt?: string
}

interface TestSession {
  id: string
  title: string
  description: string
  case_count: number
  created_at: string
  is_active: boolean
}

export default function TestAssignmentPage() {
  const params = useParams()
  const router = useRouter()
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [pathologists, setPathologists] = useState<Pathologist[]>([])
  const [selectedPathologists, setSelectedPathologists] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadTestAndPathologists()
  }, [])

  const loadTestAndPathologists = async () => {
    try {
      // Load test session
      const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select(`
          id,
          title,
          description,
          is_active,
          created_at,
          cases(count)
        `)
        .eq('id', params.testId)
        .single()

      if (sessionError) throw sessionError

      const transformedSession: TestSession = {
        ...session,
        case_count: session.cases?.length || 0
      }
      setTestSession(transformedSession)

      // Load all pathologists and their assignment status for this test
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          specialty,
          institution
        `)
        .eq('role', 'pathologist')

      if (usersError) throw usersError

      // Load assignments for this test separately
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_assignments')
        .select(`
          id,
          user_id,
          status,
          assigned_at,
          completed_at
        `)
        .eq('test_session_id', params.testId)

      if (assignmentsError) throw assignmentsError

      // Create a map of assignments by user_id
      const assignmentsMap = new Map()
      assignments?.forEach(assignment => {
        assignmentsMap.set(assignment.user_id, assignment)
      })

      // Filter users who have assignments for this test
      const assignedUsers = users?.filter(user => assignmentsMap.has(user.id)) || []
      const unassignedUsers = users?.filter(user => !assignmentsMap.has(user.id)) || []

      // Combine and transform data
      const assignedPathologists: Pathologist[] = assignedUsers.map(user => {
        const assignment = assignmentsMap.get(user.id)
        return {
          id: user.id,
          full_name: user.full_name || 'Unnamed User',
          email: 'N/A', // We'll fix this later with proper schema
          specialty: user.specialty || 'Not specified',
          institution: user.institution || 'Not specified',
          isAssigned: true,
          assignmentStatus: assignment?.status,
          assignedAt: assignment?.assigned_at,
          completedAt: assignment?.completed_at
        }
      })

      const unassignedPathologists: Pathologist[] = unassignedUsers.map(user => ({
        id: user.id,
        full_name: user.full_name || 'Unnamed User',
        email: 'N/A', // We'll fix this later with proper schema
        specialty: user.specialty || 'Not specified',
        institution: user.institution || 'Not specified',
        isAssigned: false
      }))

      const allPathologists = [...assignedPathologists, ...unassignedPathologists]
      setPathologists(allPathologists)

      // Pre-select already assigned pathologists
      const assignedIds = new Set(assignedPathologists.map(p => p.id))
      setSelectedPathologists(assignedIds)

    } catch (error) {
      console.error('Error loading data:', error)
      setErrors({ load: 'Failed to load test and pathologist data' })
    } finally {
      setLoading(false)
    }
  }

  const handlePathologistToggle = (pathologistId: string) => {
    setSelectedPathologists(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(pathologistId)) {
        newSelection.delete(pathologistId)
      } else {
        newSelection.add(pathologistId)
      }
      return newSelection
    })
  }

  const selectAll = () => {
    const allIds = new Set(filteredPathologists.map(p => p.id))
    setSelectedPathologists(allIds)
  }

  const selectNone = () => {
    setSelectedPathologists(new Set())
  }

  const assignTest = async () => {
    if (selectedPathologists.size === 0) {
      setErrors({ assignment: 'Please select at least one pathologist' })
      return
    }

    setAssigning(true)
    setErrors({})

    try {
      const currentlyAssigned = new Set(
        pathologists.filter(p => p.isAssigned).map(p => p.id)
      )
      
      // Find new assignments and removals
      const toAssign = Array.from(selectedPathologists).filter(id => !currentlyAssigned.has(id))
      const toRemove = Array.from(currentlyAssigned).filter(id => !selectedPathologists.has(id))

      // Remove unselected assignments
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_assignments')
          .delete()
          .eq('test_session_id', params.testId)
          .in('user_id', toRemove)

        if (removeError) throw removeError
      }

      // Add new assignments
      if (toAssign.length > 0) {
        const assignments = toAssign.map(userId => ({
          user_id: userId,
          test_session_id: params.testId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        }))

        const { error: assignError } = await supabase
          .from('user_assignments')
          .insert(assignments)

        if (assignError) throw assignError
      }

      // TODO: Send email notifications if enabled
      if (sendNotification && toAssign.length > 0) {
        // This would integrate with your email service
        console.log('Would send notifications to:', toAssign)
      }

      router.push('/admin')

    } catch (error) {
      console.error('Error assigning test:', error)
      setErrors({ assignment: 'Failed to assign test. Please try again.' })
    } finally {
      setAssigning(false)
    }
  }

  const filteredPathologists = pathologists.filter(pathologist =>
    pathologist.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pathologist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pathologist.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pathologist.institution?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (pathologist: Pathologist) => {
    if (!pathologist.isAssigned) return null
    
    switch (pathologist.assignmentStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'assigned':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getStatusText = (pathologist: Pathologist) => {
    if (!pathologist.isAssigned) return 'Not assigned'
    
    switch (pathologist.assignmentStatus) {
      case 'completed':
        return `Completed ${pathologist.completedAt ? new Date(pathologist.completedAt).toLocaleDateString() : ''}`
      case 'in_progress':
        return 'In progress'
      case 'assigned':
        return `Assigned ${pathologist.assignedAt ? new Date(pathologist.assignedAt).toLocaleDateString() : ''}`
      default:
        return 'Unknown status'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test assignment data...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/admin/test/${params.testId}`)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Assign Test</h1>
                <p className="text-sm text-gray-500">{testSession.title}</p>
              </div>
            </div>
            
            <button
              onClick={assignTest}
              disabled={assigning || selectedPathologists.size === 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{assigning ? 'Assigning...' : 'Update Assignments'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Test Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Session Details</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="text-lg text-gray-900">{testSession.title}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Number of Cases</dt>
              <dd className="text-lg text-gray-900">{testSession.case_count}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  testSession.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {testSession.is_active ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
          </div>
          {testSession.description && (
            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="text-gray-900">{testSession.description}</dd>
            </div>
          )}
        </div>

        {/* Assignment Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Options</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline (Optional)
              </label>
              <div className="relative">
                <Calendar className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="send-notification"
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="send-notification" className="ml-2 block text-sm text-gray-900">
                Send email notifications to assigned pathologists
              </label>
            </div>
          </div>
        </div>

        {/* Pathologist Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Select Pathologists ({selectedPathologists.size} selected)
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={selectAll}
                  className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={selectNone}
                  className="text-gray-600 hover:text-gray-500 text-sm font-medium"
                >
                  Select None
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pathologists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredPathologists.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pathologists found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No pathologists are registered in the system.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPathologists.map(pathologist => (
                  <div
                    key={pathologist.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedPathologists.has(pathologist.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedPathologists.has(pathologist.id)}
                          onChange={() => handlePathologistToggle(pathologist.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              {pathologist.full_name}
                            </h4>
                            {getStatusIcon(pathologist)}
                          </div>
                          
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>{pathologist.email}</span>
                            </div>
                            
                            {pathologist.specialty && (
                              <div className="flex items-center space-x-1">
                                <Stethoscope className="h-4 w-4" />
                                <span>{pathologist.specialty}</span>
                              </div>
                            )}
                            
                            {pathologist.institution && (
                              <div className="flex items-center space-x-1">
                                <Building className="h-4 w-4" />
                                <span>{pathologist.institution}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {getStatusText(pathologist)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-6">
            {Object.entries(errors).map(([key, message]) => (
              <div key={key} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700">{message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
