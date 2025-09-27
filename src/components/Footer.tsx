'use client'

import { Mail, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">PathforAll</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              A professional platform for pathologists to evaluate Whole Slide Images with advanced case management and assessment tools.
            </p>
          </div>

          {/* Development Info */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Development</h4>
            <div className="text-gray-300 text-sm space-y-2">
              <p>Developed by <span className="font-medium text-white">Mohamed Sharaf, MD</span></p>
              <p>From Christopher Park's Lab</p>
              <p className="text-xs text-gray-400 mt-3">
                For technical support or development inquiries:
              </p>
              <a 
                href="mailto:Mohamed.sharaf@nyulangone.org"
                className="inline-flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>Mohamed.sharaf@nyulangone.org</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Legal</h4>
            <div className="text-gray-300 text-sm space-y-2">
              <p>© 2025 PathforAll</p>
              <p>All rights reserved</p>
              <p className="text-xs text-gray-400">
                This software is intended for educational and research purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Border */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
