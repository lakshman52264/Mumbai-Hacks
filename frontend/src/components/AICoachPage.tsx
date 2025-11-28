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
      if (!uid) throw new Error('Please log in')
      const res = await aiCoachApi.askQuestion(uid, userMessage.content)
      const answerText = res.success && res.data && (res.data.answer || typeof res.data === 'string') ? (res.data.answer || String(res.data)) : 'Unable to generate a response'
      const aiMessage: Message = {
        id: nextId(),
        type: 'ai',
        content: answerText,
        timestamp: new Date(),
        hasChart: /spending|summary|breakdown/i.test(userMessage.content)
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch {
      const aiMessage: Message = { id: nextId(), type: 'ai', content: 'Something went wrong. Try again.', timestamp: new Date() }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const generateAIResponse = (_query: string) => ''

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
                  {message.hasChart && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Category Breakdown</span>
                        <TrendingUp className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#4F46E5] rounded-full" style={{ width: '31%' }} />
                          </div>
                          <span className="text-xs text-gray-600 w-12">31%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10B981] rounded-full" style={{ width: '29%' }} />
                          </div>
                          <span className="text-xs text-gray-600 w-12">29%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '23%' }} />
                          </div>
                          <span className="text-xs text-gray-600 w-12">23%</span>
                        </div>
                      </div>
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