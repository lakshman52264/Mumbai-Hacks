import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Sparkles, TrendingUp, Target } from 'lucide-react';
import { Badge } from './ui/badge';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  hasChart?: boolean;
}

const quickActions = [
  'Show Spending Summary',
  'View Goals',
  'Budget Recommendations',
  'Analyze Last Month',
];

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: "Hi Lakshman! 👋 I'm your AI financial coach. I'm here to help you understand your spending, achieve your goals, and make smarter money decisions. What would you like to know today?",
    timestamp: new Date(),
  },
];

export function AICoachPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(input),
        timestamp: new Date(),
        hasChart: input.toLowerCase().includes('spending') || input.toLowerCase().includes('summary'),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (query: string) => {
    if (query.toLowerCase().includes('spending') || query.toLowerCase().includes('summary')) {
      return "Based on your recent transactions, here's what I found:\n\n📊 Total Spending: ₹28,500\n• Groceries: ₹8,200 (29%)\n• Dining: ₹6,500 (23%)\n• Transport: ₹4,800 (17%)\n• Entertainment: ₹9,000 (31%)\n\n💡 Insight: Your entertainment spending is higher than usual. Consider setting a monthly limit of ₹6,000 to save an extra ₹3,000!";
    } else if (query.toLowerCase().includes('goal')) {
      return "You have 3 active goals:\n\n🌴 Vacation Fund: 65% complete (₹6,500 / ₹10,000)\n💻 New Laptop: 40% complete (₹20,000 / ₹50,000)\n🏠 Emergency Fund: 80% complete (₹40,000 / ₹50,000)\n\nGreat progress! You're on track to complete your Emergency Fund goal next month. Keep it up! 🎉";
    } else if (query.toLowerCase().includes('save')) {
      return "Here are my personalized savings tips for you:\n\n1. 🎯 Reduce dining out by 20% - Save ₹1,300/month\n2. 🚗 Use public transport 2 more days/week - Save ₹600/month\n3. 📺 Review streaming subscriptions - Save ₹400/month\n\nTotal potential savings: ₹2,300/month or ₹27,600/year!";
    }
    return "That's a great question! Based on your financial profile, I'd recommend focusing on building your emergency fund first. You're already at 80% - just ₹10,000 more to go! Would you like me to create a plan to help you reach this goal by next month?";
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
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

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-gray-100 text-[#1F2937]'
                  }`}
                >
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className="cursor-pointer hover:bg-indigo-50 hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors"
                onClick={() => handleQuickAction(action)}
              >
                {action}
              </Badge>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about your money..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              className="bg-[#4F46E5] hover:bg-[#4338CA]"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
