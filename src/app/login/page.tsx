'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, LogIn } from 'lucide-react'

interface NewUser {
  email: string
  password: string
  full_name: string
  specialty: string
  institution: string
  role: 'pathologist' | 'admin'
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [institution, setInstitution] = useState('')
  const [role, setRole] = useState<'pathologist' | 'admin'>('pathologist')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if user came from "Get Started" button
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
        return
      }

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // Create or update user profile (handle duplicates)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: authData.user.id,
            full_name: fullName,
            email: email,
            specialty: specialty,
            institution: institution,
            role: role
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          setError(`Profile creation failed: ${profileError.message}`)
          return
        }

        setSuccess('Account created successfully! Please check your email to verify your account.')
        
        // Clear form
        setEmail('')
        setPassword('')
        setFullName('')
        setSpecialty('')
        setInstitution('')
        
        // Switch to login mode
        setTimeout(() => {
          setIsSignUp(false)
          setSuccess('')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setSpecialty('')
    setInstitution('')
    setError('')
    setSuccess('')
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PathforAll</h1>
          <p className="text-gray-600">Case Evaluation Platform</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isSignUp 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSignUp 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Get Started</span>
          </button>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
          {/* Sign Up Fields */}
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dr. John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialty *
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  required={isSignUp}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Pathology, Dermatology, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution *
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required={isSignUp}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Hospital Name, University, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'pathologist' | 'admin')}
                  required={isSignUp}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pathologist">Pathologist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="doctor@hospital.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              minLength={6}
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading 
              ? (isSignUp ? 'Creating Account...' : 'Signing in...') 
              : (isSignUp ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp 
              ? 'Already have an account?' 
              : "Don't have an account?"
            }
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 text-indigo-600 hover:text-indigo-500 font-medium"
            >
              {isSignUp ? 'Sign In' : 'Get Started'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
