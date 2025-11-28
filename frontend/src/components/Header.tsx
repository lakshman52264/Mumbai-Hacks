import {
  Home,
  MessageSquare,
  CreditCard,
  Target,
  Bell,
  Settings,
  Menu,
  LogOut,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  currentPage: string
  onPageChange: (page: string) => void
}

interface HeaderProps {
  currentPage: string
  onPageChange: (page: string) => void
}

const menuItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'coach', label: 'AI Coach', icon: MessageSquare },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'reminders', label: 'Reminders', icon: Bell },
]

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4F46E5] to-[#10B981] rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">₹</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[#1F2937]">FinPath</div>
              <div className="text-xs text-gray-500">AI Financial Companion</div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                    isActive ? 'text-[#4F46E5] bg-indigo-50' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-indigo-50 rounded-lg"
                      transition={{ type: 'spring', duration: 0.5 }}
                    />
                  )}
                  <Icon className={`h-5 w-5 relative z-10 ${isActive ? 'text-[#4F46E5]' : ''}`} />
                  <span className={`relative z-10 text-sm ${isActive ? 'text-[#4F46E5]' : ''}`}>{item.label}</span>
                </motion.button>
              )
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-full flex items-center justify-center text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm">{user?.displayName || 'User'}</span>
                    <span className="text-xs text-gray-500">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPageChange('settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4F46E5] to-[#10B981] rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">₹</span>
                    </div>
                    <div>
                      <div className="text-[#1F2937]">FinPath</div>
                      <div className="text-xs text-gray-500">AI Financial Companion</div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentPage === item.id

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onPageChange(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive ? 'text-[#4F46E5] bg-indigo-50' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-full flex items-center justify-center text-white">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-[#1F2937]">{user?.displayName || 'User'}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onPageChange('settings')
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-50"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}