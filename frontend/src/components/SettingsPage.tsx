import { useState } from 'react'
import { motion } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Moon, Sun, Bell, AlertTriangle, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const [name, setName] = useState('Lakshman')
  const [email, setEmail] = useState('lakshman@example.com')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [notifications, setNotifications] = useState({ email: true, push: true, reminders: true })
  const [isDeleting, setIsDeleting] = useState(false)

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  

  const handleDeleteAccount = async () => {
    if (!user) return

    setIsDeleting(true)
    try {
      // Call backend to delete user data
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/users/${user.uid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Logout user after successful deletion
        await logout()
        // Redirect to home or login page
        window.location.href = '/'
      } else {
        alert('Failed to delete account. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[#1F2937] mb-2">Settings</h1>
        <p className="text-gray-600">Manage your profile, theme, notifications, and data</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Profile</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-br from-[#F59E0B] to-[#EF4444] rounded-full flex items-center justify-center text-white">
                {name.charAt(0).toUpperCase()}
              </div>
              <Badge variant="secondary">{email}</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">Save Changes</Button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Theme</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? <Sun className="h-5 w-5 text-[#F59E0B]" /> : <Moon className="h-5 w-5 text-[#4F46E5]" />}
                <div>
                  <div className="text-sm text-[#1F2937]">{theme === 'light' ? 'Light' : 'Dark'} Mode</div>
                  <div className="text-xs text-gray-600">Switch between themes</div>
                </div>
              </div>
              <Button variant="outline" onClick={toggleTheme}>Toggle</Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Email Notifications</div>
                  <div className="text-xs text-gray-600">Receive updates via email</div>
                </div>
              </div>
              <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Push Notifications</div>
                  <div className="text-xs text-gray-600">Get alerts in-app</div>
                </div>
              </div>
              <input type="checkbox" checked={notifications.push} onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Reminder Alerts</div>
                  <div className="text-xs text-gray-600">Stay on top of tasks</div>
                </div>
              </div>
              <input type="checkbox" checked={notifications.reminders} onChange={(e) => setNotifications({ ...notifications, reminders: e.target.checked })} />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 border-red-200">
          <h2 className="text-[#1F2937] mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="text-sm font-medium text-red-800 mb-2">Delete Account</h3>
              <p className="text-sm text-red-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including:
                      <br /><br />
                      • All transaction history<br />
                      • Bank account connections<br />
                      • Financial goals and progress<br />
                      • Profile information<br />
                      • All other personal data
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}