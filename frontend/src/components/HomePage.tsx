import { motion } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Sparkles,
  Plus,
  MessageSquare,
  Download,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useBank } from '../contexts/BankContext'
import { useAuth } from '../contexts/AuthContext'

const quickActions = [
  { label: 'Add Transaction', icon: Plus, variant: 'default' as const },
  { label: 'Chat with Coach', icon: MessageSquare, variant: 'outline' as const },
  { label: 'Download Report', icon: Download, variant: 'outline' as const },
]

const categoryTrends = [
  { category: 'Groceries', lastMonth: 7800, thisMonth: 8200 },
  { category: 'Dining', lastMonth: 5300, thisMonth: 6500 },
  { category: 'Transport', lastMonth: 4500, thisMonth: 4800 },
  { category: 'Entertainment', lastMonth: 6200, thisMonth: 9000 },
]

export function HomePage() {
  const { financialData, transactions, bankAccounts } = useBank()
  const { user } = useAuth()

  if (!financialData || transactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-[#1F2937] mb-2">Welcome back! 👋</h1>
          <p className="text-gray-600">
            Your financial dashboard is ready. Start by connecting more accounts or adding transactions.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-6">
              Connect your bank accounts or add some transactions to see your financial insights.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with AI Coach
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  const realStats = [
    {
      label: 'Total Income',
      value: `₹${financialData.totalIncome.toLocaleString()}`,
      change: '+12%',
      trend: 'up',
      icon: TrendingUp,
      color: 'emerald',
    },
    {
      label: 'Total Spending',
      value: `₹${financialData.totalExpenses.toLocaleString()}`,
      change: '-5%',
      trend: 'down',
      icon: Wallet,
      color: 'red',
    },
    {
      label: 'Savings Progress',
      value: `₹${financialData.totalSavings.toLocaleString()}`,
      change: financialData.totalSavings > 0 ? '+18%' : '0%',
      trend: financialData.totalSavings > 0 ? 'up' : 'down',
      icon: PiggyBank,
      color: 'amber',
    },
    {
      label: 'Predicted Savings',
      value: `₹${(financialData.totalIncome * 0.2).toLocaleString()}`,
      change: '+8%',
      trend: 'up',
      icon: Sparkles,
      color: 'indigo',
    },
  ]

  const budgetRules = [
    {
      label: 'Needs (50%)',
      value: Math.min((financialData.totalExpenses * 0.5) / Math.max(financialData.totalIncome * 0.5, 1) * 100, 100),
      amount: `₹${(financialData.totalExpenses * 0.5).toLocaleString()} / ₹${(financialData.totalIncome * 0.5).toLocaleString()}`,
    },
    {
      label: 'Wants (30%)',
      value: Math.min((financialData.totalExpenses * 0.3) / Math.max(financialData.totalIncome * 0.3, 1) * 100, 100),
      amount: `₹${(financialData.totalExpenses * 0.3).toLocaleString()} / ₹${(financialData.totalIncome * 0.3).toLocaleString()}`,
    },
    {
      label: 'Savings (20%)',
      value: Math.min((financialData.totalSavings) / Math.max(financialData.totalIncome * 0.2, 1) * 100, 100),
      amount: `₹${financialData.totalSavings.toLocaleString()} / ₹${(financialData.totalIncome * 0.2).toLocaleString()}`,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-[#1F2937] mb-2">Hi, {user?.displayName || bankAccounts[0]?.name || 'User'} 👋</h1>
        <p className="text-gray-600">
          You've saved <span className="text-[#10B981]">₹{financialData.totalSavings.toLocaleString()}</span> this month 🎯
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {realStats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            emerald: 'bg-emerald-50 text-[#10B981]',
            red: 'bg-red-50 text-red-500',
            amber: 'bg-amber-50 text-[#F59E0B]',
            indigo: 'bg-indigo-50 text-[#4F46E5]',
          }[stat.color]

          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colorClasses}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-sm ${stat.trend === 'up' ? 'text-[#10B981]' : 'text-red-500'}`}>{stat.change}</span>
                </div>
                <div className="text-2xl text-[#1F2937] mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <motion.div key={action.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={action.variant} className={action.variant === 'default' ? 'bg-[#4F46E5] hover:bg-[#4338CA]' : ''}>
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Recent Insights</h2>
          <div className="space-y-3">
            {financialData.insights.map((insight, index) => (
              <div key={index} className={`flex items-start gap-3 p-4 rounded-lg ${insight.type === 'success' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <div className="text-2xl">{insight.icon}</div>
                <div>
                  <div className="text-sm text-[#1F2937]">{insight.text}</div>
                </div>
              </div>
            ))}
            {financialData.insights.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI insights will appear here as you use the app more</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">50-30-20 Budget Rule</h2>
          <div className="space-y-4">
            {budgetRules.map((rule) => (
              <div key={rule.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#1F2937]">{rule.label}</span>
                  <span className="text-sm text-gray-600">{rule.amount}</span>
                </div>
                <Progress value={rule.value} className="h-3" />
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Income vs Expense Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={financialData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={financialData.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(d) => `${d.name} ${((d.percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {financialData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Category Growth Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="lastMonth" fill="#9CA3AF" name="Last Month" />
              <Bar dataKey="thisMonth" fill="#4F46E5" name="This Month" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">AI-Generated Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financialData.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${insight.type === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'}`}
              >
                <div className="text-2xl">{insight.icon}</div>
                <div className="flex-1">
                  <div className="text-sm text-[#1F2937]">{insight.text}</div>
                </div>
                {insight.type === 'warning' ? (
                  <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-[#10B981]" />
                )}
              </motion.div>
            ))}
            {financialData.insights.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your spending is looking good! Keep up the great work.</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}