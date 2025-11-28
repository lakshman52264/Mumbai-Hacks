import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { HomePage } from './components/HomePage'
import { TransactionsPage } from './components/TransactionsPage'
import { AICoachPage } from './components/AICoachPage'
import { GoalsPage } from './components/GoalsPage'
import { RemindersPage } from './components/RemindersPage'
import { SettingsPage } from './components/SettingsPage'
import { LoginPage } from './components/LoginPage'
import { GetStarted } from './components/GetStarted'
import { SetuCallback } from './components/SetuCallback'
import { useAuth } from './contexts/AuthContext'
import { useBank } from './contexts/BankContext'

export default function App() {
  const { user, loading, login } = useAuth()
  const { hasBankAccounts, hasActiveConsent } = useBank()
  const [currentPage, setCurrentPage] = useState('home')
  const [isSetuCallback, setIsSetuCallback] = useState(false)

  // Monitor URL changes for Setu callback
  useEffect(() => {
    const checkSetuCallback = () => {
      const urlParams = new URLSearchParams(window.location.search)
      setIsSetuCallback(urlParams.has('success') && urlParams.has('id'))
    }

    checkSetuCallback()

    // Listen for URL changes
    const handlePopState = () => checkSetuCallback()
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (isSetuCallback) {
    return <SetuCallback onContinue={() => {
      // Clear URL params and update state
      window.history.replaceState({}, '', '/')
      setIsSetuCallback(false)
    }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899]">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-2xl">₹</span>
          </div>
          <div className="text-white text-lg">Loading FinPath...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={login} />
  }

  if (!hasBankAccounts && !hasActiveConsent) {
    return <GetStarted />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'coach':
        return <AICoachPage />
      case 'transactions':
        return <TransactionsPage />
      case 'goals':
        return <GoalsPage />
      case 'reminders':
        return <RemindersPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="p-4 lg:p-8">{renderPage()}</main>
    </div>
  )
}
