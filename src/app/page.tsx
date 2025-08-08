'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserData } from '@/types/user'

export default function LoginPage() {
  const [nik, setNik] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const findUserByNIK = async (nik: string): Promise<UserData | null> => {
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('nik', '==', nik))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data() as UserData
        return {
          uid: userDoc.id,
          ...userData
        }
      }
      return null
    } catch (error) {
      console.error('Error finding user by NIK:', error)
      return null
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Find user by NIK
      const userData = await findUserByNIK(nik)
      
      if (!userData) {
        setError('NIK tidak ditemukan.')
        return
      }

      if (!userData.email) {
        setError('User tidak memiliki email yang terdaftar.')
        return
      }

      // Login with email and password
      await signInWithEmailAndPassword(auth, userData.email, password)
      router.push('/menu')
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'NIK atau password salah.'
        : err.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="bg-white rounded-3xl shadow-md w-full max-w-4xl flex overflow-hidden">
        
        {/* Logo */}
        <div className="w-1/2 flex items-center justify-center p-10">
          <img
            src="/logo.jpeg"
            alt="Ansinda Logo"
            className="w-48"
          />
        </div>

        {/* Form */}
        <div className="w-1/2 p-10 flex flex-col justify-center bg-white">
          <h1 className="text-2xl font-bold text-black mb-1">
            ANSINDA COMUNICATION
          </h1>
          <h2 className="text-xl font-semibold text-blue-800 mb-8">
            INDONESIA SYSTEM
          </h2>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIK
              </label>
              <input
                type="text"
                placeholder="Masukkan NIK Anda"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Masukkan password Anda"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3 rounded-md transition duration-300 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="w-full text-center mt-8">
            <span className="text-xs text-gray-400">Version 1.0.2</span>
          </div>
        </div>
      </div>
    </div>
  )
}