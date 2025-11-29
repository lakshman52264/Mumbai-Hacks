import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Bell, Clock, CheckCircle2, CalendarDays, Trash2, Zap, AlertTriangle, Target, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { alertsApi, type AlertData } from '../api'

type Status = 'active' | 'resolved'

interface Alert {
  id: string
  title: string
  message: string
  category: string
  risk_level: string
  status: Status
  created_at: Date
  alert_type: string
  email_content?: string
}

export function RemindersPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (user) {
      fetchAlerts()
    }
  }, [user])

  const fetchAlerts = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await alertsApi.getAlerts(user.uid)
      if (response.success && response.data) {
        const alertsData = response.data.map((alert: AlertData) => ({
          id: alert.id,
          title: getAlertTitle(alert),
          message: alert.message || alert.email_content || 'Alert notification',
          category: getCategoryFromType(alert.alert_type),
          risk_level: alert.risk_level || 'low',
          status: alert.is_resolved ? 'resolved' : 'active',
          created_at: alert.created_at?.toDate ? alert.created_at.toDate() : new Date(alert.created_at),
          alert_type: alert.alert_type,
          email_content: alert.email_content
        }))
        setAlerts(alertsData)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAlertTitle = (alert: AlertData): string => {
    if (alert.alert_type === 'anomaly') return 'Suspicious Transaction Detected'
    if (alert.alert_type === 'goals') return 'Goal Update'
    return 'Financial Alert'
  }

  const getCategoryFromType = (alertType: string): string => {
    if (alertType === 'anomaly') return 'Security'
    if (alertType === 'goals') return 'Goals'
    return 'General'
  }

  const getCategoryStyles = (category: string, riskLevel?: string) => {
    const key = category.toLowerCase()
    if (key === 'security') {
      if (riskLevel === 'high') return { accent: '#DC2626', bg: 'bg-red-50', text: 'text-[#1F2937]', chipText: 'text-[#DC2626]', border: 'border-[#DC2626]' }
      if (riskLevel === 'medium') return { accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-[#1F2937]', chipText: 'text-[#F59E0B]', border: 'border-[#F59E0B]' }
      return { accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-[#1F2937]', chipText: 'text-[#F59E0B]', border: 'border-[#F59E0B]' }
    }
    if (key === 'goals') return { accent: '#10B981', bg: 'bg-emerald-50', text: 'text-[#1F2937]', chipText: 'text-[#10B981]', border: 'border-[#10B981]' }
    if (key === 'general') return { accent: '#4F46E5', bg: 'bg-indigo-50', text: 'text-[#1F2937]', chipText: 'text-[#4F46E5]', border: 'border-[#4F46E5]' }
    return { accent: '#6B7280', bg: 'bg-gray-50', text: 'text-[#1F2937]', chipText: 'text-gray-600', border: 'border-gray-300' }
  }

  const getCategoryIcon = (category: string) => {
    const key = category.toLowerCase()
    if (key === 'security') return AlertTriangle
    if (key === 'goals') return Target
    if (key === 'general') return Bell
    return TrendingUp
  }

  const markResolved = async (id: string) => {
    if (!user) return
    
    try {
      const response = await alertsApi.resolveAlert(user.uid, id)
      if (response.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)))
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const deleteAlert = async (id: string) => {
    if (!user) return
    
    try {
      const response = await alertsApi.deleteAlert(user.uid, id)
      if (response.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const formatTime = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mi}`
  }

  const filtered = alerts.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (categoryFilter !== 'all' && a.category.toLowerCase() !== categoryFilter) return false
    return true
  })

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-[#1F2937] mb-2">Sign In Required</h2>
          <p className="text-gray-600">Please sign in to view your alerts and notifications</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1F2937] mb-2">Alerts & Notifications</h1>
          <p className="text-gray-600">Stay informed about important financial events and security alerts</p>
        </div>
        <Button onClick={fetchAlerts} className="bg-[#4F46E5] hover:bg-[#4338CA]">
          <Bell className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {loading ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4" />
            <p className="text-gray-600">Loading alerts...</p>
          </Card>
        </motion.div>
      ) : alerts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-[#1F2937] mb-2">No Alerts Yet</h2>
            <p className="text-gray-600">You're all caught up! We'll notify you when there's something important.</p>
          </Card>
        </motion.div>
      ) : null}

      {!loading && alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="min-w-[200px]">
                <Label>Category</Label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm">
                  <option value="all">All</option>
                  <option value="security">Security</option>
                  <option value="goals">Goals</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="min-w-[200px]">
                <Label>Status</Label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map((alert) => (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`relative p-4 border rounded-xl flex items-start justify-between ${getCategoryStyles(alert.category, alert.risk_level).border} ${getCategoryStyles(alert.category, alert.risk_level).bg}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: getCategoryStyles(alert.category, alert.risk_level).accent }} />
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 bg-white rounded-lg flex-shrink-0`}>
                      {(() => {
                        const Icon = getCategoryIcon(alert.category)
                        return <Icon className={`h-5 w-5 ${getCategoryStyles(alert.category, alert.risk_level).chipText}`} />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-medium ${getCategoryStyles(alert.category, alert.risk_level).text}`}>{alert.title}</span>
                        <Badge variant="secondary" className={`${getCategoryStyles(alert.category, alert.risk_level).bg} ${getCategoryStyles(alert.category, alert.risk_level).chipText}`}>
                          {alert.category}
                        </Badge>
                        {alert.risk_level && (
                          <Badge variant="secondary" className={`${getCategoryStyles(alert.category, alert.risk_level).bg} ${getCategoryStyles(alert.category, alert.risk_level).chipText}`}>
                            {alert.risk_level.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(alert.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(alert.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-2 break-words">
                        {alert.message.length > 150 ? alert.message.substring(0, 150) + '...' : alert.message}
                      </div>
                      {alert.email_content && (
                        <details className="mt-2">
                          <summary className="text-xs text-[#4F46E5] cursor-pointer hover:underline">View full details</summary>
                          <div className="text-xs text-gray-600 mt-2 p-3 bg-white rounded border border-gray-200 whitespace-pre-wrap break-words">
                            {alert.email_content}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {alert.status === 'active' ? (
                      <Button className="bg-[#10B981] hover:bg-[#0EA5A6]" onClick={() => markResolved(alert.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-[#10B981]">Resolved</Badge>
                    )}
                    <Button variant="outline" onClick={() => deleteAlert(alert.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">No alerts match your filters</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {!loading && alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-[#4F46E5]" />
              <h2 className="text-[#1F2937]">Alert Statistics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-gray-600">Security Alerts</span>
                </div>
                <div className="text-2xl font-bold text-[#1F2937]">
                  {alerts.filter(a => a.category === 'Security' && a.status === 'active').length}
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-gray-600">Goal Alerts</span>
                </div>
                <div className="text-2xl font-bold text-[#1F2937]">
                  {alerts.filter(a => a.category === 'Goals' && a.status === 'active').length}
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs text-gray-600">Resolved</span>
                </div>
                <div className="text-2xl font-bold text-[#1F2937]">
                  {alerts.filter(a => a.status === 'resolved').length}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}