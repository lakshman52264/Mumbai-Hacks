import { useState } from 'react'
import { motion } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Bell, Clock, CheckCircle2, CalendarDays, Trash2, AlarmClock, CreditCard, PiggyBank, PlayCircle, Zap, Mail } from 'lucide-react'

type Status = 'upcoming' | 'completed'

interface Reminder {
  id: string
  title: string
  dueDate: string // YYYY-MM-DD
  dueTime?: string // HH:mm
  category: string
  notes?: string
  status: Status
}

const initialReminders: Reminder[] = [
  { id: '1', title: 'Pay Credit Card Bill', dueDate: '2025-11-20', dueTime: '10:00', category: 'Bills', notes: 'HDFC card ending 4412', status: 'upcoming' },
  { id: '2', title: 'Transfer to Savings', dueDate: '2025-11-25', dueTime: '09:00', category: 'Savings', notes: 'Monthly auto-transfer', status: 'upcoming' },
  { id: '3', title: 'Netflix Subscription', dueDate: '2025-11-18', dueTime: '12:00', category: 'Subscriptions', status: 'completed' },
]

function formatAmountSuggestion(category: string) {
  if (category.toLowerCase().includes('bills')) return '₹2,000'
  if (category.toLowerCase().includes('savings')) return '₹3,500'
  return '₹1,000'
}

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newReminder, setNewReminder] = useState({ title: '', dueDate: '', dueTime: '', category: '', notes: '' })
  const [integrations, setIntegrations] = useState({ zapier: true, calendar: true, email: true })

  const getCategoryStyles = (category: string) => {
    const key = category.toLowerCase()
    if (key === 'bills') return { accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-[#1F2937]', chipText: 'text-[#F59E0B]', border: 'border-[#F59E0B]' }
    if (key === 'savings') return { accent: '#10B981', bg: 'bg-emerald-50', text: 'text-[#1F2937]', chipText: 'text-[#10B981]', border: 'border-[#10B981]' }
    if (key === 'subscriptions') return { accent: '#4F46E5', bg: 'bg-indigo-50', text: 'text-[#1F2937]', chipText: 'text-[#4F46E5]', border: 'border-[#4F46E5]' }
    return { accent: '#6B7280', bg: 'bg-gray-50', text: 'text-[#1F2937]', chipText: 'text-gray-600', border: 'border-gray-300' }
  }

  const getCategoryIcon = (category: string) => {
    const key = category.toLowerCase()
    if (key === 'bills') return CreditCard
    if (key === 'savings') return PiggyBank
    if (key === 'subscriptions') return PlayCircle
    return Bell
  }

  const addReminder = () => {
    if (!newReminder.title || !newReminder.dueDate) return
    const reminder: Reminder = {
      id: Date.now().toString(),
      title: newReminder.title,
      dueDate: newReminder.dueDate,
      dueTime: newReminder.dueTime || undefined,
      category: newReminder.category || 'General',
      notes: newReminder.notes || undefined,
      status: 'upcoming',
    }
    setReminders([reminder, ...reminders])
    setNewReminder({ title: '', dueDate: '', dueTime: '', category: '', notes: '' })
    setIsDialogOpen(false)
  }

  const markDone = (id: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'completed' } : r)))
  }

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  const snoozeOneDay = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const d = new Date(r.dueDate + (r.dueTime ? 'T' + r.dueTime : 'T00:00'))
        d.setDate(d.getDate() + 1)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return { ...r, dueDate: `${yyyy}-${mm}-${dd}`, dueTime: r.dueTime ? `${hh}:${mi}` : r.dueTime }
      })
    )
  }

  const filtered = reminders.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (categoryFilter !== 'all' && r.category.toLowerCase() !== categoryFilter) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1F2937] mb-2">Reminders</h1>
          <p className="text-gray-600">Stay on top of bills, savings, and subscriptions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Bell className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reminder</DialogTitle>
              <DialogDescription>Create a reminder and never miss important tasks</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} placeholder="e.g., Pay Electricity Bill" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Due Date</Label>
                  <Input id="date" type="date" value={newReminder.dueDate} onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="time">Due Time</Label>
                  <Input id="time" type="time" value={newReminder.dueTime} onChange={(e) => setNewReminder({ ...newReminder, dueTime: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={newReminder.category} onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value })} placeholder="Bills / Savings / Subscriptions" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={newReminder.notes} onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })} placeholder="Optional details" />
              </div>
              <Button onClick={addReminder} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">Create Reminder</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-amber-50 border-[#4F46E5]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg">
              <AlarmClock className="h-6 w-6 text-[#4F46E5]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-1">Smart Suggestion</h3>
              <p className="text-sm text-gray-600 mb-3">Your average savings transfer is {formatAmountSuggestion('Savings')}. Set a monthly reminder to automate it.</p>
              <Button size="sm" variant="outline"><Clock className="h-4 w-4 mr-2" />Schedule Monthly</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="min-w-[200px]">
              <Label>Category</Label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm">
                <option value="all">All</option>
                <option value="bills">Bills</option>
                <option value="savings">Savings</option>
                <option value="subscriptions">Subscriptions</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="min-w-[200px]">
              <Label>Status</Label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm">
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((reminder) => (
              <motion.div key={reminder.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`relative p-4 border rounded-xl flex items-start justify-between ${getCategoryStyles(reminder.category).border} ${getCategoryStyles(reminder.category).bg}`}>
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: getCategoryStyles(reminder.category).accent }} />
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-white rounded-lg`}>
                    {(() => {
                      const Icon = getCategoryIcon(reminder.category)
                      return <Icon className={`h-5 w-5 ${getCategoryStyles(reminder.category).chipText}`} />
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm ${getCategoryStyles(reminder.category).text}`}>{reminder.title}</span>
                      <Badge variant="secondary" className={`${getCategoryStyles(reminder.category).bg} ${getCategoryStyles(reminder.category).chipText}`}>{reminder.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{reminder.dueDate}</span>
                      {reminder.dueTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{reminder.dueTime}</span>}
                    </div>
                    {reminder.notes && <div className="text-xs text-gray-600 mt-2">{reminder.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {reminder.status === 'upcoming' ? (
                    <>
                      <Button variant="outline" onClick={() => snoozeOneDay(reminder.id)}>Snooze +1d</Button>
                      <Button className="bg-[#10B981] hover:bg-[#0EA5A6]" onClick={() => markDone(reminder.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Done
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-50 text-[#10B981]">Completed</Badge>
                  )}
                  <Button variant="outline" onClick={() => deleteReminder(reminder.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-gray-600">No reminders found</div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">Connected Integrations</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Your reminders are synced with Zapier for email notifications and calendar events</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Zapier</div>
                  <div className="text-xs text-gray-600">Automation workflows</div>
                </div>
              </div>
              <button
                onClick={() => setIntegrations({ ...integrations, zapier: !integrations.zapier })}
                className={`${integrations.zapier ? 'bg-[#10B981]' : 'bg-gray-200'} w-10 h-5 rounded-full relative transition-colors`}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 ${integrations.zapier ? 'left-6' : 'left-1'} w-4 h-4 bg-white rounded-full shadow`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Google Calendar</div>
                  <div className="text-xs text-gray-600">Add events for due reminders</div>
                </div>
              </div>
              <button
                onClick={() => setIntegrations({ ...integrations, calendar: !integrations.calendar })}
                className={`${integrations.calendar ? 'bg-[#10B981]' : 'bg-gray-200'} w-10 h-5 rounded-full relative transition-colors`}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 ${integrations.calendar ? 'left-6' : 'left-1'} w-4 h-4 bg-white rounded-full shadow`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#4F46E5]" />
                <div>
                  <div className="text-sm text-[#1F2937]">Email Notifications</div>
                  <div className="text-xs text-gray-600">Receive alerts for upcoming payments</div>
                </div>
              </div>
              <button
                onClick={() => setIntegrations({ ...integrations, email: !integrations.email })}
                className={`${integrations.email ? 'bg-[#10B981]' : 'bg-gray-200'} w-10 h-5 rounded-full relative transition-colors`}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 ${integrations.email ? 'left-6' : 'left-1'} w-4 h-4 bg-white rounded-full shadow`} />
              </button>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline">Manage Integrations</Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}