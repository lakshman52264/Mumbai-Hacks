import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Target, TrendingUp, Sparkles } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  emoji: string;
  target: number;
  current: number;
  category: string;
}

const initialGoals: Goal[] = [
  {
    id: '1',
    title: 'Save for Vacation',
    emoji: '🌴',
    target: 10000,
    current: 6500,
    category: 'Travel',
  },
  {
    id: '2',
    title: 'New Laptop',
    emoji: '💻',
    target: 50000,
    current: 20000,
    category: 'Technology',
  },
  {
    id: '3',
    title: 'Emergency Fund',
    emoji: '🏠',
    target: 50000,
    current: 40000,
    category: 'Savings',
  },
  {
    id: '4',
    title: 'Fitness Equipment',
    emoji: '🏋️',
    target: 15000,
    current: 4500,
    category: 'Health',
  },
];

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    emoji: '🎯',
    target: '',
    category: '',
  });

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target) return;

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      emoji: newGoal.emoji,
      target: parseInt(newGoal.target),
      current: 0,
      category: newGoal.category || 'General',
    };

    setGoals([...goals, goal]);
    setNewGoal({ title: '', emoji: '🎯', target: '', category: '' });
    setIsDialogOpen(false);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-[#10B981]';
    if (percentage >= 50) return 'text-[#F59E0B]';
    return 'text-[#4F46E5]';
  };

  const avgMonthlySavings = 3500;
  const suggestedGoal = avgMonthlySavings * 1.5;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[#1F2937] mb-2">Financial Goals</h1>
          <p className="text-gray-600">Track your progress and stay motivated</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="h-4 w-4 mr-2" />
              Add New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a financial goal to track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., New Car"
                />
              </div>
              <div>
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={newGoal.emoji}
                  onChange={(e) => setNewGoal({ ...newGoal, emoji: e.target.value })}
                  placeholder="🚗"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="target">Target Amount (₹)</Label>
                <Input
                  id="target"
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  placeholder="100000"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  placeholder="e.g., Vehicle"
                />
              </div>
              <Button 
                onClick={handleAddGoal}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              >
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* AI Suggestion Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-emerald-50 border-[#4F46E5]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg">
              <Sparkles className="h-6 w-6 text-[#4F46E5]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-1">AI Suggested Goal</h3>
              <p className="text-sm text-gray-600 mb-3">
                Based on your average savings of ₹{avgMonthlySavings.toLocaleString()}/month, 
                you can aim for ₹{suggestedGoal.toLocaleString()} this month
              </p>
              <Button size="sm" variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Set as Goal
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal, index) => {
          const percentage = getProgressPercentage(goal.current, goal.target);
          const progressColor = getProgressColor(percentage);
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{goal.emoji}</div>
                    <div>
                      <h3 className="text-[#1F2937]">{goal.title}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {goal.category}
                      </Badge>
                    </div>
                  </div>
                  <TrendingUp className={`h-5 w-5 ${progressColor}`} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className={progressColor}>
                      {percentage.toFixed(0)}% complete
                    </span>
                  </div>
                  <Progress value={percentage} className="h-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      ₹{goal.current.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600">
                      ₹{goal.target.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      Remaining: <span className={progressColor}>
                        ₹{(goal.target - goal.current).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {percentage >= 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2 text-[#10B981]"
                  >
                    <span className="text-xl">🎉</span>
                    <span className="text-sm">Goal achieved! Congratulations!</span>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Goals Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl text-[#4F46E5] mb-1">{goals.length}</div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#10B981] mb-1">
                {goals.filter(g => getProgressPercentage(g.current, g.target) >= 100).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#F59E0B] mb-1">
                ₹{goals.reduce((sum, g) => sum + g.current, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-gray-600 mb-1">
                ₹{goals.reduce((sum, g) => sum + (g.target - g.current), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
