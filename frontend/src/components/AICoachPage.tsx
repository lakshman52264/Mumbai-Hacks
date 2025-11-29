import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from './ui/badge'
import { aiCoachApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  hasChart?: boolean
  coachResponse?: CoachResponse
}

interface GoalStatusDetails {
  status?: string
  risk_level?: string
  progress_percentage?: number
  amount_saved?: number
  amount_remaining?: number
  months_remaining?: number
  required_monthly_contribution?: number
  estimated_current_monthly?: number
  shortfall?: number
  deadline?: string | null
}

interface GoalDetail {
  title?: string
  target_amount?: number
  current_amount?: number
  priority?: string
  goal_id?: string
  status_details?: GoalStatusDetails
}

interface GoalsInsights {
  summary?: string
  total_goals?: number
  on_track_count?: number
  at_risk_count?: number
  overall_progress?: number
  goal_details?: GoalDetail[]
}

interface MerchantInfo {
  merchant: string
  amount: number
  count: number
}

interface SpendingInsights {
  summary?: string
  total_spending?: number
  transaction_count?: number
  top_category?: string
  top_merchant?: string
  key_findings?: string[]
  by_category?: Record<string, number>
  by_merchant?: MerchantInfo[]
}

interface DetailedInsights {
  goals_insights?: GoalsInsights
  spending_insights?: SpendingInsights
}

interface CoachResponse {
  response_type?: string
  user_query?: string
  direct_answer?: string
  detailed_insights?: DetailedInsights
  visualizations?: unknown[]
  recommendations?: unknown[]
  encouragement?: string
  confidence_score?: number
  tone?: string
}

const quickActions = ['Show Spending Summary', 'View Goals', 'Budget Recommendations', 'Analyze Last Month']

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content:
      "Hi Lakshman! 👋 I'm your AI financial coach. I'm here to help you understand your spending, achieve your goals, and make smarter money decisions. What would you like to know today?",
    timestamp: new Date(),
  },
]

export function AICoachPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const idRef = useRef(1)
  const nextId = () => String((idRef.current += 1))
  const { user } = useAuth()

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage: Message = {
      id: nextId(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }
    setMessages([...messages, userMessage])
    setInput('')
    setIsTyping(true)
    try {
      const uid = user?.uid
      if (!uid) {
        throw new Error('Please log in to use the AI coach.')
      }
      const res = await aiCoachApi.askQuestion(uid, userMessage.content)
      const coachResponse =
        res.success && typeof res.data === 'object' && res.data !== null && 'coach_response' in res.data
          ? (res.data as { coach_response?: CoachResponse }).coach_response
          : undefined
      const hasVisualizations =
        coachResponse &&
        Array.isArray(coachResponse.visualizations) &&
        coachResponse.visualizations.length > 0

      const primary =
        res.success && res.data && (typeof res.data === 'string' || (res.data as { answer?: string }).answer)
          ? (typeof res.data === 'string' ? res.data : (res.data as { answer?: string }).answer || '')
          : ''
      const fallbackSummary = coachResponse && (coachResponse as { summary?: string }).summary
      const answerText = (primary && primary.trim().length > 0)
        ? primary
        : (fallbackSummary && fallbackSummary.trim().length > 0)
          ? fallbackSummary
          : 'Unable to generate a response'
      const aiMessage: Message = {
        id: nextId(),
        type: 'ai',
        content: answerText,
        timestamp: new Date(),
        hasChart: hasVisualizations || /spending|summary|breakdown/i.test(userMessage.content),
        coachResponse,
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      const fallback =
        msg && /log in/i.test(msg)
          ? msg
          : 'Something went wrong while talking to your AI coach. Please try again.'
      const aiMessage: Message = {
        id: nextId(),
        type: 'ai',
        content: fallback,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setIsTyping(false)
    }
  }


  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-[#4F46E5] to-[#10B981] rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[#1F2937]">AI Financial Coach</h1>
            <p className="text-sm text-gray-600">Ask me anything about your finances</p>
          </div>
        </div>
      </motion.div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.type === 'user' ? 'bg-[#4F46E5] text-white' : 'bg-gray-100 text-[#1F2937]'}`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  {message.type === 'ai' && message.coachResponse && message.coachResponse.detailed_insights && message.coachResponse.detailed_insights.goals_insights && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Goals Overview</span>
                        <TrendingUp className="h-4 w-4 text-[#10B981]" />
                      </div>
                      {(() => {
                        const gi = message.coachResponse!.detailed_insights!.goals_insights as GoalsInsights
                        const total = gi.total_goals || 0
                        const onTrack = gi.on_track_count || 0
                        const atRisk = gi.at_risk_count || 0
                        const progress = gi.overall_progress || 0
                        const details = gi.goal_details || []
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                              <div className="bg-gray-50 p-2 rounded">Total Goals: {total}</div>
                              <div className="bg-gray-50 p-2 rounded">Overall Progress: {progress}%</div>
                              <div className="bg-gray-50 p-2 rounded">On Track: {onTrack}</div>
                              <div className="bg-gray-50 p-2 rounded">At Risk/Overdue: {atRisk}</div>
                            </div>
                            {details.slice(0, 3).map((g, idx) => (
                              <div key={g.goal_id || String(idx)} className="border border-gray-200 rounded p-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-[#1F2937]">{g.title || 'Goal'}</span>
                                  <span className="text-xs text-gray-500">{g.priority || 'medium'}</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  <div>Target: ₹{(g.target_amount || 0).toLocaleString()}</div>
                                  <div>Saved: ₹{(g.current_amount || 0).toLocaleString()}</div>
                                  <div>
                                    Status: {g.status_details?.status || 'unknown'} · Progress: {g.status_details?.progress_percentage || 0}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                  {message.type === 'ai' && message.coachResponse && message.coachResponse.detailed_insights && message.coachResponse.detailed_insights.spending_insights && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Category Breakdown</span>
                        <TrendingUp className="h-4 w-4 text-[#10B981]" />
                      </div>
                      {(() => {
                        const si = message.coachResponse!.detailed_insights!.spending_insights as SpendingInsights
                        const byCategory = si.by_category || {}
                        const totalSpending = si.total_spending || 0
                        const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)
                        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

                        if (categories.length === 0) {
                          return <div className="text-xs text-gray-500">No category data available</div>
                        }

                        return (
                          <div className="space-y-2">
                            {categories.map(([category, amount], idx) => {
                              const percentage = totalSpending > 0 ? (amount / totalSpending * 100).toFixed(1) : '0.0'
                              return (
                                <div key={category} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-700 capitalize">{category}</span>
                                    <span className="text-xs text-gray-600">₹{amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${percentage}%`,
                                          backgroundColor: colors[idx % colors.length]
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-600 w-12">{percentage}%</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                  <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                  <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Badge key={action} variant="outline" className="cursor-pointer hover:bg-indigo-50 hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors" onClick={() => handleQuickAction(action)}>
                {action}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything about your money..." className="flex-1" />
            <Button onClick={handleSend} className="bg-[#4F46E5] hover:bg-[#4338CA]" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}