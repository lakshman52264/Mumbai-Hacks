import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Sparkles,
  Plus,
  MessageSquare,
  Download
} from 'lucide-react';

const stats = [
  {
    label: 'Total Income',
    value: '₹45,000',
    change: '+12%',
    trend: 'up',
    icon: TrendingUp,
    color: 'emerald',
  },
  {
    label: 'Total Spending',
    value: '₹28,500',
    change: '-5%',
    trend: 'down',
    icon: Wallet,
    color: 'red',
  },
  {
    label: 'Savings Progress',
    value: '₹16,500',
    change: '+18%',
    trend: 'up',
    icon: PiggyBank,
    color: 'amber',
  },
  {
    label: 'Predicted Savings',
    value: '₹18,200',
    change: '+8%',
    trend: 'up',
    icon: Sparkles,
    color: 'indigo',
  },
];

const quickActions = [
  { label: 'Add Transaction', icon: Plus, variant: 'default' as const },
  { label: 'Chat with Coach', icon: MessageSquare, variant: 'outline' as const },
  { label: 'Download Report', icon: Download, variant: 'outline' as const },
];

export function HomePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Greeting Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-[#1F2937] mb-2">
          Hi, Lakshman 👋
        </h1>
        <p className="text-gray-600">
          You've saved <span className="text-[#10B981]">18% more</span> this month 🎯
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            emerald: 'bg-emerald-50 text-[#10B981]',
            red: 'bg-red-50 text-red-500',
            amber: 'bg-amber-50 text-[#F59E0B]',
            indigo: 'bg-indigo-50 text-[#4F46E5]',
          }[stat.color];

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colorClasses}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-sm ${stat.trend === 'up' ? 'text-[#10B981]' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl text-[#1F2937] mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant={action.variant} 
                    className={action.variant === 'default' ? 'bg-[#4F46E5] hover:bg-[#4338CA]' : ''}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Recent Insights</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl">💰</div>
              <div>
                <div className="text-sm text-[#1F2937]">Great Progress!</div>
                <div className="text-sm text-gray-600">You've saved ₹2,500 more compared to last month</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl">🍽️</div>
              <div>
                <div className="text-sm text-[#1F2937]">Watch Your Spending</div>
                <div className="text-sm text-gray-600">Dining expenses are up by ₹1,200 this week</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="text-sm text-[#1F2937]">Goal Achievement</div>
                <div className="text-sm text-gray-600">You're 85% closer to your vacation savings goal!</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
