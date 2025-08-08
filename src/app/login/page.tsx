'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import sessionManager from '@/lib/sessionManager'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      
      // Initialize session management after successful login
      sessionManager.init()
      
      router.push('/menu')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="bg-white rounded-3xl shadow-md w-full max-w-4xl flex overflow-hidden">
        {/* Left: Logo */}
        <div className="w-1/2 bg-white flex items-center justify-center p-10">
          <img
            src="/logo.jpeg" // Pastikan file ada di /public/logo.png
            alt="Ansinda Logo"
            className="w-48"
          />
        </div>

        {/* Right: Form */}
        <div className="w-1/2 bg-white p-10 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-black">
            ANSINDA COMUNICATION
          </h1>
          <h2 className="text-xl font-semibold text-blue-800 mb-8">
            INDONESIA SYSTEM
          </h2>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3 rounded-md transition duration-300"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
