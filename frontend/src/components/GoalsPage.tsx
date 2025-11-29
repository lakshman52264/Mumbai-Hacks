import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Plus, Target, TrendingUp, Sparkles, Edit, Trash2, Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { goalsApi } from '../api'
import { useBank } from '../contexts/BankContext'

interface Goal {
  id: string
  title: string
  emoji?: string
  target_amount: number
  current_amount: number
  deadline?: string
  description?: string
  category?: string
  duration_months?: number
  monthly_contribution?: number
  priority?: string
  feasible?: boolean
  ai_processing?: boolean
  ai_insights?: string
  recommendations?: string[]
  created_at?: string
  updated_at?: string
  risk_level?: string
  reason?: string
  completion_months?: number
}

const initialGoals: Goal[] = []

type NewGoalForm = { title: string; emoji: string; target_amount: string; category: string; deadline: string; description: string; duration_months: string; priority: string }

export function GoalsPage() {
  const { user } = useAuth()
  const { transactions } = useBank()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [newGoal, setNewGoal] = useState<NewGoalForm>({ title: '', emoji: '🎯', target_amount: '', category: '', deadline: '', description: '', duration_months: '', priority: 'medium' })
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmGoalId, setConfirmGoalId] = useState<string>('')
  const [confirmDueDate, setConfirmDueDate] = useState<string>('')
  const [confirmAmount, setConfirmAmount] = useState<string>('')
  const [isRebalanceOpen, setIsRebalanceOpen] = useState(false)
  const [proposedAllocations, setProposedAllocations] = useState<Record<string, number>>({})
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!user?.uid) return
      setLoading(true)
      const response = await goalsApi.getGoals(user.uid)
      if (response.success && response.data) {
        setGoals(response.data)
      }
      setLoading(false)
    }
    run()
  }, [user?.uid])

  const fetchGoals = async () => {
    if (!user?.uid) return
    const response = await goalsApi.getGoals(user.uid)
    if (response.success && response.data) {
      setGoals(response.data)
    }
  }

  const handleAddGoal = async () => {
    if (!user?.uid || !newGoal.title || !newGoal.target_amount) return

    const goalData = {
      title: newGoal.title,
      target_amount: parseInt(newGoal.target_amount),
      current_amount: 0,
      category: newGoal.category || 'General',
      deadline: newGoal.deadline || undefined,
      description: newGoal.description || undefined,
      duration_months: newGoal.duration_months ? parseInt(newGoal.duration_months) : undefined,
      priority: newGoal.priority || 'medium',
      monthly_contribution: (() => {
        const ta = parseFloat(newGoal.target_amount || '0')
        const dm = parseInt(newGoal.duration_months || '0')
        const targetPerMonth = dm > 0 ? ta / dm : 0
        const k = (newGoal.priority || '').toLowerCase()
        const weight = k === 'high' ? 0.6 : k === 'low' ? 0.25 : 0.4
        const cap = Math.round(weight * avgMonthlySavings)
        const val = Math.min(targetPerMonth || 0, cap || 0)
        return Math.max(0, Math.round(val))
      })(),
    }

    const response = await goalsApi.createGoal(user.uid, goalData)
    if (response.success) {
      await goalsApi.getGoals(user.uid).then(r => { if (r.success && r.data) setGoals(r.data) })
      setNewGoal({ title: '', emoji: '🎯', target_amount: '', category: '', deadline: '', description: '', duration_months: '', priority: 'medium' })
      setIsDialogOpen(false)
    }
  }

  const handleUpdateGoal = async () => {
    if (!user?.uid || !editingGoal) return

    const goalData = {
      title: newGoal.title,
      target_amount: parseInt(newGoal.target_amount),
      current_amount: editingGoal.current_amount,
      category: newGoal.category || 'General',
      deadline: newGoal.deadline || undefined,
      description: newGoal.description || undefined,
      duration_months: newGoal.duration_months ? parseInt(newGoal.duration_months) : undefined,
      priority: newGoal.priority || 'medium',
      monthly_contribution: (() => {
        const ta = parseFloat(newGoal.target_amount || '0')
        const dm = parseInt(newGoal.duration_months || '0')
        const targetPerMonth = dm > 0 ? ta / dm : 0
        const k = (newGoal.priority || '').toLowerCase()
        const weight = k === 'high' ? 0.6 : k === 'low' ? 0.25 : 0.4
        const cap = Math.round(weight * avgMonthlySavings)
        const val = Math.min(targetPerMonth || 0, cap || 0)
        return Math.max(0, Math.round(val))
      })(),
    }

    const response = await goalsApi.updateGoal(user.uid, editingGoal.id, goalData)
    if (response.success) {
      await goalsApi.getGoals(user.uid).then(r => { if (r.success && r.data) setGoals(r.data) })
      setNewGoal({ title: '', emoji: '🎯', target_amount: '', category: '', deadline: '', description: '', duration_months: '', priority: 'medium' })
      setIsDialogOpen(false)
      setEditingGoal(null)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.uid) return
    const response = await goalsApi.deleteGoal(user.uid, goalId)
    if (response.success) {
      await goalsApi.getGoals(user.uid).then(r => { if (r.success && r.data) setGoals(r.data) })
    }
  }

  const handleVerifyMonthly = (goal: Goal) => {
    setConfirmGoalId(goal.id)
    setConfirmAmount((goal.monthly_contribution || 0).toString())
    setConfirmDueDate(new Date().toISOString().split('T')[0]) // Today's date as default
    setIsConfirmOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!user?.uid || !confirmGoalId || !confirmDueDate || !confirmAmount) return

    const response = await goalsApi.confirmPayment(user.uid, confirmGoalId, confirmDueDate, parseFloat(confirmAmount))

    if (response.success) {
      setIsConfirmOpen(false)
      setConfirmGoalId('')
      setConfirmDueDate('')
      setConfirmAmount('')
      await fetchGoals()
    }
  }

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal)
    setNewGoal({
      title: goal.title,
      emoji: goal.emoji || '🎯',
      target_amount: goal.target_amount.toString(),
      category: goal.category || '',
      deadline: goal.deadline || '',
      description: goal.description || '',
      duration_months: goal.duration_months ? String(goal.duration_months) : '',
      priority: goal.priority || 'medium',
    })
    setIsDialogOpen(true)
  }

  const getProgressPercentage = (current: number, target: number) => Math.min((current / target) * 100, 100)
  const getProgressColor = (percentage: number) => (percentage >= 80 ? 'text-[#10B981]' : percentage >= 50 ? 'text-[#F59E0B]' : 'text-[#4F46E5]')

  // Calculate average monthly savings from transactions
  const calculateAvgMonthlySavings = () => {
    if (!transactions.length) return 3500 // fallback

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    const recentTransactions = transactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate >= sixMonthsAgo
    })

    const monthlySavings = recentTransactions.reduce((acc, t) => {
      if (t.type === 'credit') acc += t.amount
      else acc -= t.amount
      return acc
    }, 0) / 6

    return Math.max(monthlySavings, 0) || 3500
  }

  const avgMonthlySavings = calculateAvgMonthlySavings()
  const suggestedGoal = Math.round(avgMonthlySavings * 1.5)



  const handleSetSuggestedGoal = () => {
    setNewGoal({
      title: 'Monthly Savings Goal',
      emoji: '💰',
      target_amount: suggestedGoal.toString(),
      category: 'Savings',
      deadline: '',
      description: `AI suggested goal based on your average savings of ₹${avgMonthlySavings.toLocaleString()}/month`,
      duration_months: '6',
      priority: 'medium',
    })
    setIsDialogOpen(true)
  }

  const computeRebalanceAllocations = () => {
    if (goals.length === 0) return {}
    const weightOf = (p?: string) => {
      const k = (p || '').toLowerCase()
      if (k === 'high') return 3
      if (k === 'medium') return 2
      return 1
    }
    const weights = goals.map(g => weightOf((g as unknown as { priority?: string }).priority))
    const sumW = weights.reduce((a, b) => a + b, 0) || 1
    const allocations: Record<string, number> = {}
    goals.forEach((g, i) => {
      const share = weights[i] / sumW
      const base = Math.round(share * avgMonthlySavings)
      const remaining = Math.max(0, g.target_amount - g.current_amount)
      const months = Math.max(1, g.duration_months || 6)
      const targetPerMonth = Math.round(remaining / months)
      allocations[g.id] = Math.max(0, Math.min(base, targetPerMonth))
    })
    return allocations
  }

  const openRebalanceDialog = () => {
    const allocs = computeRebalanceAllocations()
    setProposedAllocations(allocs)
    setIsRebalanceOpen(true)
  }

  const openDetailsDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setIsDetailsOpen(true)
  }

  const applyRebalance = async () => {
    if (!user?.uid) return
    const updates = Object.entries(proposedAllocations)
    for (const [goalId, amount] of updates) {
      const goal = goals.find(g => g.id === goalId)
      if (!goal) continue
      await goalsApi.updateGoal(user.uid, goalId, {
        title: goal.title,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        category: goal.category,
        deadline: goal.deadline,
        description: goal.description,
        duration_months: goal.duration_months,
        priority: (goal as unknown as { priority?: string }).priority || 'medium',
        monthly_contribution: amount,
      })
    }
    const response = await goalsApi.getGoals(user.uid)
    if (response.success && response.data) {
      setGoals(response.data)
    }
    setIsRebalanceOpen(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1F2937] mb-2">Financial Goals</h1>
          <p className="text-gray-600">Track your progress and stay motivated</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingGoal(null)
            setNewGoal({ title: '', emoji: '🎯', target_amount: '', category: '', deadline: '', description: '', duration_months: '', priority: 'medium' })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="h-4 w-4 mr-2" />
              Add New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>Set a financial goal to track your progress</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input id="title" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g., New Car" />
              </div>
              <div>
                <Label htmlFor="emoji">Emoji</Label>
                <Input id="emoji" value={newGoal.emoji} onChange={(e) => setNewGoal({ ...newGoal, emoji: e.target.value })} placeholder="🚗" maxLength={2} />
              </div>
              <div>
                <Label htmlFor="target_amount">Target Amount (₹)</Label>
                <Input id="target_amount" type="number" value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} placeholder="100000" />
              </div>
              <div>
                <Label htmlFor="duration_months">Duration (months)</Label>
                <Input id="duration_months" type="number" value={newGoal.duration_months} onChange={(e) => setNewGoal({ ...newGoal, duration_months: e.target.value })} placeholder="6" />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" value={newGoal.priority} onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={newGoal.category} onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })} placeholder="e.g., Vehicle" />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input id="deadline" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" value={newGoal.description} onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} placeholder="Additional details..." />
              </div>
              <Button onClick={editingGoal ? handleUpdateGoal : handleAddGoal} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">{editingGoal ? 'Update Goal' : 'Create Goal'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="outline" onClick={openRebalanceDialog}>Rebalance Monthly Contributions</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 bg-linear-to-r from-indigo-50 to-emerald-50 border-[#4F46E5]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg">
              <Sparkles className="h-6 w-6 text-[#4F46E5]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-1">AI Suggested Goal</h3>
              <p className="text-sm text-gray-600 mb-3">Based on your average savings of ₹{avgMonthlySavings.toLocaleString()}/month, you can aim for ₹{suggestedGoal.toLocaleString()} this month</p>
              <Button size="sm" variant="outline" onClick={handleSetSuggestedGoal}><Target className="h-4 w-4 mr-2" />Set as Goal</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-500">Loading goals...</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-500">No goals yet. Create your first goal!</div>
          </div>
        ) : (
          [...goals].sort((a, b) => {
            const rank = (p?: string) => {
              const k = (p || '').toLowerCase()
              if (k === 'high') return 0
              if (k === 'medium') return 1
              return 2
            }
            const r = rank(a.priority) - rank(b.priority)
            if (r !== 0) return r
            const ar = a.target_amount - a.current_amount
            const br = b.target_amount - b.current_amount
            return br - ar
          }).map((goal, index) => {
            const percentage = getProgressPercentage(goal.current_amount, goal.target_amount)
            const progressColor = getProgressColor(percentage)
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.1 }}>
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{goal.emoji || '🎯'}</div>
                      <div>
                        <h3 className="text-[#1F2937]">{goal.title}</h3>
                        <Badge variant="secondary" className="mt-1">{goal.category || 'General'}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openDetailsDialog(goal)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(goal)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleVerifyMonthly(goal)}>Verify payment</Button>
                      <TrendingUp className={`h-5 w-5 ${progressColor}`} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className={progressColor}>{percentage.toFixed(0)}% complete</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">₹{goal.current_amount.toLocaleString()}</span>
                      <span className="text-sm text-gray-600">₹{goal.target_amount.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-sm text-gray-600">Remaining: <span className={progressColor}>₹{(goal.target_amount - goal.current_amount).toLocaleString()}</span></div>
                    </div>

                    {goal.ai_processing ? (
                      <div className="flex items-center gap-2 text-sm text-[#4F46E5]">
                        <div className="animate-spin h-4 w-4 border-2 border-[#4F46E5] border-t-transparent rounded-full"></div>
                        <span>AI analyzing feasibility...</span>
                      </div>
                    ) : typeof goal.feasible === 'boolean' && (
                      <div className="text-sm">{goal.feasible ? <Badge variant="secondary" className="bg-emerald-50 text-[#10B981]">Feasible</Badge> : <Badge variant="secondary" className="bg-rose-50 text-rose-600">Needs attention</Badge>}</div>
                    )}
                  </div>
                  {percentage >= 100 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2 text-[#10B981]">
                      <span className="text-xl">🎉</span>
                      <span className="text-sm">Goal achieved! Congratulations!</span>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            )
          })
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Goals Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl text-[#4F46E5] mb-1">{goals.length}</div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#10B981] mb-1">{goals.filter((g) => getProgressPercentage(g.current_amount, g.target_amount) >= 100).length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#F59E0B] mb-1">₹{goals.reduce((sum, g) => sum + g.current_amount, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-gray-600 mb-1">₹{goals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Goal Payment</DialogTitle>
            <DialogDescription>Update progress by confirming this month’s payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="confirm_amount">Amount (₹)</Label>
              <Input id="confirm_amount" type="number" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="confirm_due">Due Date</Label>
              <Input id="confirm_due" type="date" value={confirmDueDate} onChange={(e) => setConfirmDueDate(e.target.value)} />
            </div>
            <Button onClick={handleConfirmPayment} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRebalanceOpen} onOpenChange={setIsRebalanceOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rebalance Monthly Contributions</DialogTitle>
            <DialogDescription>Allocate your monthly savings across goals based on priority</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.emoji || '🎯'}</span>
                  <div>
                    <div className="text-[#1F2937]">{g.title}</div>
                    <div className="text-gray-500">Current: ₹{(g.monthly_contribution || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-[#4F46E5]">New: ₹{(proposedAllocations[g.id] || 0).toLocaleString()}</div>
              </div>
            ))}
            <Button onClick={applyRebalance} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">Apply Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedGoal?.emoji || '🎯'}</span>
              {selectedGoal?.title} - Detailed Analysis
            </DialogTitle>
            <DialogDescription>Complete goal information and AI insights</DialogDescription>
          </DialogHeader>
          {selectedGoal && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F2937]">Goal Details</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Title:</span> {selectedGoal.title}</div>
                    <div><span className="font-medium">Category:</span> {selectedGoal.category || 'General'}</div>
                    <div><span className="font-medium">Priority:</span> <Badge variant="secondary">{selectedGoal.priority || 'medium'}</Badge></div>
                    <div><span className="font-medium">Duration:</span> {selectedGoal.duration_months || 'N/A'} months</div>
                    <div><span className="font-medium">Target Amount:</span> ₹{selectedGoal.target_amount.toLocaleString()}</div>
                    <div><span className="font-medium">Current Amount:</span> ₹{selectedGoal.current_amount.toLocaleString()}</div>
                    <div><span className="font-medium">Monthly Contribution:</span> ₹{(selectedGoal.monthly_contribution || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F2937]">Progress & Status</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Progress:</span> {getProgressPercentage(selectedGoal.current_amount, selectedGoal.target_amount).toFixed(1)}%</div>
                    <div><span className="font-medium">Remaining:</span> ₹{(selectedGoal.target_amount - selectedGoal.current_amount).toLocaleString()}</div>
                    <div><span className="font-medium">Feasible:</span> {typeof selectedGoal.feasible === 'boolean' ? (selectedGoal.feasible ? <CheckCircle className="inline h-4 w-4 text-green-500" /> : <AlertTriangle className="inline h-4 w-4 text-red-500" />) : 'Not analyzed'}</div>
                    <div><span className="font-medium">Risk Level:</span> <Badge variant="secondary" className={selectedGoal.risk_level === 'high' ? 'bg-red-100 text-red-800' : ''}>{selectedGoal.risk_level || 'unknown'}</Badge></div>
                    <div><span className="font-medium">Completion Months:</span> {selectedGoal.completion_months || 'N/A'}</div>
                    <div><span className="font-medium">AI Processing:</span> {selectedGoal.ai_processing ? <Clock className="inline h-4 w-4 animate-spin" /> : 'Complete'}</div>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              {selectedGoal.ai_insights && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#4F46E5]" />
                    AI Insights
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                    {selectedGoal.ai_insights}
                  </div>
                </div>
              )}

              {/* Feasibility Reason */}
              {selectedGoal.reason && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F2937]">Feasibility Analysis</h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                    {selectedGoal.reason}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedGoal.recommendations && selectedGoal.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F2937]">AI Recommendations</h4>
                  <div className="space-y-2">
                    {selectedGoal.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <div><span className="font-medium">Created:</span> {selectedGoal.created_at ? new Date(selectedGoal.created_at).toLocaleString() : 'N/A'}</div>
                </div>
                <div className="text-xs text-gray-500">
                  <div><span className="font-medium">Updated:</span> {selectedGoal.updated_at ? new Date(selectedGoal.updated_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}