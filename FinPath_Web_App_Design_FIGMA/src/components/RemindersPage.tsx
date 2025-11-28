import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
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
import { 
  Plus, 
  Bell, 
  Lightbulb, 
  Coins, 
  CreditCard, 
  Calendar,
  Trash2
} from 'lucide-react';

interface Reminder {
  id: string;
  icon: string;
  iconComponent: any;
  title: string;
  description: string;
  dueDate: string;
  category: 'bill' | 'savings' | 'goal' | 'payment';
  enabled: boolean;
}

const initialReminders: Reminder[] = [
  {
    id: '1',
    icon: '💡',
    iconComponent: Lightbulb,
    title: 'Electricity Bill Due',
    description: 'Payment due in 2 days',
    dueDate: '2025-11-11',
    category: 'bill',
    enabled: true,
  },
  {
    id: '2',
    icon: '🪙',
    iconComponent: Coins,
    title: 'Transfer to Savings Goal',
    description: 'Transfer ₹500 to vacation savings',
    dueDate: '2025-11-10',
    category: 'savings',
    enabled: true,
  },
  {
    id: '3',
    icon: '💳',
    iconComponent: CreditCard,
    title: 'Credit Card Payment',
    description: 'Payment due in 5 days - ₹12,450',
    dueDate: '2025-11-14',
    category: 'payment',
    enabled: true,
  },
  {
    id: '4',
    icon: '📱',
    iconComponent: Bell,
    title: 'Mobile Recharge',
    description: 'Plan expires in 3 days',
    dueDate: '2025-11-12',
    category: 'bill',
    enabled: false,
  },
  {
    id: '5',
    icon: '🎯',
    iconComponent: Calendar,
    title: 'Monthly Budget Review',
    description: 'Review and adjust your budget',
    dueDate: '2025-11-15',
    category: 'goal',
    enabled: true,
  },
];

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bill':
        return 'bg-amber-50 text-[#F59E0B] border-amber-200';
      case 'savings':
        return 'bg-emerald-50 text-[#10B981] border-emerald-200';
      case 'goal':
        return 'bg-indigo-50 text-[#4F46E5] border-indigo-200';
      case 'payment':
        return 'bg-red-50 text-red-500 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getDaysUntil = (dueDate: string) => {
    const today = new Date('2025-11-09');
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Overdue';
    return `in ${diffDays} days`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[#1F2937] mb-2">Reminders & Alerts</h1>
          <p className="text-gray-600">Never miss an important payment or goal</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Reminder</DialogTitle>
              <DialogDescription>
                Set up a reminder for bills, payments, or savings goals
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reminder-title">Title</Label>
                <Input
                  id="reminder-title"
                  placeholder="e.g., Internet Bill"
                />
              </div>
              <div>
                <Label htmlFor="reminder-description">Description</Label>
                <Input
                  id="reminder-description"
                  placeholder="e.g., Payment due for monthly internet"
                />
              </div>
              <div>
                <Label htmlFor="reminder-date">Due Date</Label>
                <Input
                  id="reminder-date"
                  type="date"
                />
              </div>
              <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                Create Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#1F2937]">Email Notifications</div>
                <div className="text-sm text-gray-500">
                  Receive reminder emails via Zapier integration
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#1F2937]">In-App Notifications</div>
                <div className="text-sm text-gray-500">
                  Show notifications within the app
                </div>
              </div>
              <Switch
                checked={inAppNotifications}
                onCheckedChange={setInAppNotifications}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Reminders List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Active Reminders</h2>
          <div className="space-y-3">
            {reminders.map((reminder, index) => {
              const Icon = reminder.iconComponent;
              const daysUntil = getDaysUntil(reminder.dueDate);
              
              return (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className={`p-4 rounded-lg border-2 ${getCategoryColor(reminder.category)} ${
                    !reminder.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{reminder.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="text-sm text-[#1F2937]">
                            {reminder.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {reminder.description}
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={daysUntil === 'Overdue' ? 'border-red-500 text-red-500' : ''}
                        >
                          {daysUntil}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reminder.enabled}
                            onCheckedChange={() => toggleReminder(reminder.id)}
                          />
                          <span className="text-xs text-gray-500">
                            {reminder.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReminder(reminder.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Integration Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-start gap-3">
            <Bell className="h-6 w-6 text-[#4F46E5]" />
            <div>
              <h3 className="text-[#1F2937] mb-2">Connected Integrations</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your reminders are synced with Zapier for email notifications and calendar events
              </p>
              <Button variant="outline" size="sm">
                Manage Integrations
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
