'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Building,
  GraduationCap,
  Save,
  X,
  Search,
  Filter,
  Eye,
  EyeOff,
  Microscope
} from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string
  email: string
  specialty?: string
  institution?: string
  role: string
  created_at: string
  is_active?: boolean
}

interface NewUser {
  email: string
  password: string
  full_name: string
  specialty: string
  institution: string
  role: 'pathologist' | 'admin'
}

export default function UserManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'pathologist' | 'admin'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    full_name: '',
    specialty: '',
    institution: '',
    role: 'pathologist'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAdminAccess()
    loadUsers()
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

  const loadUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateNewUser = (user: NewUser): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!user.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(user.email)) {
      errors.email = 'Email is invalid'
    }

    if (!user.password.trim()) {
      errors.password = 'Password is required'
    } else if (user.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (!user.full_name.trim()) {
      errors.full_name = 'Full name is required'
    }

    if (!user.specialty.trim()) {
      errors.specialty = 'Specialty is required'
    }

    if (!user.institution.trim()) {
      errors.institution = 'Institution is required'
    }

    return errors
  }

  const validateEditUser = (user: Partial<UserProfile>): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!user.full_name?.trim()) {
      errors.full_name = 'Full name is required'
    }

    if (!user.specialty?.trim()) {
      errors.specialty = 'Specialty is required'
    }

    if (!user.institution?.trim()) {
      errors.institution = 'Institution is required'
    }

    return errors
  }

  const handleAddUser = async () => {
    const validationErrors = validateNewUser(newUser)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors({})

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      })

      if (authError) throw authError

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: newUser.full_name,
          specialty: newUser.specialty,
          institution: newUser.institution,
          role: newUser.role,
          email: newUser.email
        })

      if (profileError) throw profileError

      // Reset form and reload users
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        specialty: '',
        institution: '',
        role: 'pathologist'
      })
      setShowAddModal(false)
      await loadUsers()
    } catch (error) {
      console.error('Error adding user:', error)
      if (error instanceof Error && error.message.includes('already registered')) {
        setErrors({ email: 'User with this email already exists' })
      } else {
        setErrors({ general: 'Failed to create user. Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    const validationErrors = validateEditUser(editingUser)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editingUser.full_name,
          specialty: editingUser.specialty,
          institution: editingUser.institution,
          role: editingUser.role
        })
        .eq('id', editingUser.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      setErrors({ general: 'Failed to update user. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      console.log('Starting user deletion for:', userId)

      // First, delete related data (assignments and responses)
      console.log('Deleting user assignments...')
      const { error: assignmentsError } = await supabase
        .from('user_assignments')
        .delete()
        .eq('user_id', userId)

      if (assignmentsError) {
        console.error('Error deleting assignments:', assignmentsError)
        throw assignmentsError
      }

      console.log('Deleting case responses...')
      const { error: responsesError } = await supabase
        .from('case_responses')
        .delete()
        .eq('user_id', userId)

      if (responsesError) {
        console.error('Error deleting responses:', responsesError)
        throw responsesError
      }

      // Delete user profile
      console.log('Deleting user profile...')
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        throw profileError
      }

      // Delete auth user
      console.log('Deleting auth user...')
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('Error deleting auth user:', authError)
        throw authError
      }

      console.log('User deletion completed successfully')
      await loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const openEditModal = (user: UserProfile) => {
    setEditingUser({ ...user })
    setShowEditModal(true)
    setErrors({})
  }

  const openAddModal = () => {
    setNewUser({
      email: '',
      password: '',
      full_name: '',
      specialty: '',
      institution: '',
      role: 'pathologist'
    })
    setShowAddModal(true)
    setErrors({})
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.institution?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-500/10 rounded-xl">
                <Microscope className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <p className="text-sm text-slate-400">Manage pathologists and administrators</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-4 py-2 rounded-xl shadow-lg shadow-teal-500/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'pathologist')}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Roles</option>
              <option value="pathologist">Pathologists</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white">
              Users ({filteredUsers.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Specialty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Institution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-teal-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-teal-500/10 text-teal-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {user.specialty || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {user.institution || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-teal-400 hover:text-teal-300 transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border border-slate-700 w-11/12 max-w-md shadow-2xl rounded-xl bg-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white">Add New User</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
                    {errors.general}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.email ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="user@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        errors.password ? 'border-red-500' : 'border-slate-700'
                      }`}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.full_name ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Dr. John Smith"
                  />
                  {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Specialty *
                  </label>
                  <input
                    type="text"
                    value={newUser.specialty}
                    onChange={(e) => setNewUser({ ...newUser, specialty: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.specialty ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Pathology"
                  />
                  {errors.specialty && <p className="mt-1 text-sm text-red-400">{errors.specialty}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Institution *
                  </label>
                  <input
                    type="text"
                    value={newUser.institution}
                    onChange={(e) => setNewUser({ ...newUser, institution: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.institution ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Medical Center"
                  />
                  {errors.institution && <p className="mt-1 text-sm text-red-400">{errors.institution}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'pathologist' })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pathologist">Pathologist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl shadow-lg shadow-teal-500/25 disabled:opacity-50 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border border-slate-700 w-11/12 max-w-md shadow-2xl rounded-xl bg-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
                    {errors.general}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-xl text-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.full_name ? 'border-red-500' : 'border-slate-700'
                    }`}
                  />
                  {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Specialty *
                  </label>
                  <input
                    type="text"
                    value={editingUser.specialty || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, specialty: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.specialty ? 'border-red-500' : 'border-slate-700'
                    }`}
                  />
                  {errors.specialty && <p className="mt-1 text-sm text-red-400">{errors.specialty}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Institution *
                  </label>
                  <input
                    type="text"
                    value={editingUser.institution || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, institution: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-900/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.institution ? 'border-red-500' : 'border-slate-700'
                    }`}
                  />
                  {errors.institution && <p className="mt-1 text-sm text-red-400">{errors.institution}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pathologist">Pathologist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl shadow-lg shadow-teal-500/25 disabled:opacity-50 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
