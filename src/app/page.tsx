import Link from 'next/link'
import { Microscope, Shield, Users, BarChart3, Mail } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">PathforAll</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-slate-200 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-teal-500/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
              <span className="text-teal-400 text-sm font-medium">Professional WSI Evaluation Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Whole Slide Image
              <span className="block bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Assessment Made Simple
              </span>
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl mx-auto mb-8">
              A streamlined platform for pathologists to evaluate whole slide images
              with precision, featuring advanced case management and comprehensive assessment tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-xl shadow-teal-500/30 text-base"
              >
                Start Evaluating
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-semibold transition-all border border-slate-700 text-base"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-teal-500/30 transition-colors">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center mb-3">
                <Microscope className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">WSI Viewer</h3>
              <p className="text-slate-200 text-xs lg:text-sm">High-resolution slide viewing with zoom and pan controls</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-teal-500/30 transition-colors">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Case Management</h3>
              <p className="text-slate-200 text-xs lg:text-sm">Organized test sessions with progress tracking</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-teal-500/30 transition-colors">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Analytics</h3>
              <p className="text-slate-200 text-xs lg:text-sm">Detailed performance metrics and reporting</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 hover:border-teal-500/30 transition-colors">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Secure</h3>
              <p className="text-slate-200 text-xs lg:text-sm">Enterprise-grade security for medical data</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2 text-slate-200 text-sm">
              <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded flex items-center justify-center">
                <Microscope className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-medium text-slate-200">PathforAll</span>
              <span className="text-slate-600">|</span>
              <span>Developed by Mohamed Sharaf, MD</span>
              <span className="text-slate-600">|</span>
              <span>Christopher Park&apos;s Lab</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <a
                href="mailto:Mohamed.sharaf@nyulangone.org"
                className="inline-flex items-center text-slate-200 hover:text-teal-400 transition-colors"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Contact
              </a>
              <span className="text-slate-600">|</span>
              <span className="text-slate-200">© 2025 PathforAll</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
