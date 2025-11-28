import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
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
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const monthlyData = [
  { month: 'Jan', income: 42000, expense: 28000 },
  { month: 'Feb', income: 45000, expense: 31000 },
  { month: 'Mar', income: 43000, expense: 27000 },
  { month: 'Apr', income: 47000, expense: 29000 },
  { month: 'May', income: 45000, expense: 28500 },
];

const categoryData = [
  { name: 'Groceries', value: 8200, color: '#4F46E5' },
  { name: 'Dining', value: 6500, color: '#10B981' },
  { name: 'Transport', value: 4800, color: '#F59E0B' },
  { name: 'Entertainment', value: 9000, color: '#EF4444' },
];

const categoryTrends = [
  { category: 'Groceries', lastMonth: 7800, thisMonth: 8200 },
  { category: 'Dining', lastMonth: 5300, thisMonth: 6500 },
  { category: 'Transport', lastMonth: 4500, thisMonth: 4800 },
  { category: 'Entertainment', lastMonth: 6200, thisMonth: 9000 },
];

const budgetRules = [
  { label: 'Needs (50%)', value: 55, color: 'bg-[#4F46E5]', amount: '₹22,500 / ₹22,500' },
  { label: 'Wants (30%)', value: 72, color: 'bg-[#F59E0B]', amount: '₹9,750 / ₹13,500' },
  { label: 'Savings (20%)', value: 92, color: 'bg-[#10B981]', amount: '₹8,280 / ₹9,000' },
];

const insights = [
  {
    icon: '🍽️',
    text: 'You overspent ₹1,200 on dining this week',
    type: 'warning',
  },
  {
    icon: '🎉',
    text: 'Great job saving ₹2,500 more this month!',
    type: 'success',
  },
  {
    icon: '💡',
    text: 'Entertainment spending is 45% higher than last month',
    type: 'warning',
  },
  {
    icon: '✅',
    text: 'You\'re on track with your grocery budget',
    type: 'success',
  },
];

export function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[#1F2937] mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Your complete financial overview and analytics</p>
      </motion.div>

      {/* 50-30-20 Budget Rules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">50-30-20 Budget Rule</h2>
          <div className="space-y-4">
            {budgetRules.map((rule, index) => (
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Income vs Expense Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Expense"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-[#1F2937] mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Category Growth */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Category Growth Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="lastMonth" fill="#9CA3AF" name="Last Month" />
              <Bar dataKey="thisMonth" fill="#4F46E5" name="This Month" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Insights Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">AI-Generated Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  insight.type === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'
                }`}
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
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
