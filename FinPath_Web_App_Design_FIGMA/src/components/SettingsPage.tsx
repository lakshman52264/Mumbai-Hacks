import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  User, 
  Mail, 
  Shield, 
  Palette, 
  Database,
  LogOut,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { Slider } from './ui/slider';

export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [needsRatio, setNeedsRatio] = useState([50]);
  const [wantsRatio, setWantsRatio] = useState([30]);
  const [savingsRatio, setSavingsRatio] = useState([20]);

  const integrations = [
    { name: 'Gmail', connected: true, icon: '📧' },
    { name: 'Zapier', connected: true, icon: '⚡' },
    { name: 'Google Sheets', connected: false, icon: '📊' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[#1F2937] mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">Personal Information</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" defaultValue="Lakshman" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue="" placeholder="Last Name" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="lakshman@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue="+91 98765 43210" />
            </div>
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              Save Changes
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Connected Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">Connected Integrations</h2>
          </div>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <div className="text-sm text-[#1F2937]">{integration.name}</div>
                    <Badge
                      variant={integration.connected ? 'default' : 'secondary'}
                      className={integration.connected ? 'bg-[#10B981]' : ''}
                    >
                      {integration.connected ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        'Not Connected'
                      )}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant={integration.connected ? 'outline' : 'default'}
                  size="sm"
                  className={!integration.connected ? 'bg-[#4F46E5] hover:bg-[#4338CA]' : ''}
                >
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Budget Customization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">Budget Rule Customization</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Adjust the 50-30-20 rule to match your financial goals
          </p>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Needs</Label>
                <span className="text-sm text-[#4F46E5]">{needsRatio[0]}%</span>
              </div>
              <Slider
                value={needsRatio}
                onValueChange={setNeedsRatio}
                max={100}
                step={5}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">Essential expenses like rent, utilities, groceries</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Wants</Label>
                <span className="text-sm text-[#F59E0B]">{wantsRatio[0]}%</span>
              </div>
              <Slider
                value={wantsRatio}
                onValueChange={setWantsRatio}
                max={100}
                step={5}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">Entertainment, dining out, hobbies</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Savings</Label>
                <span className="text-sm text-[#10B981]">{savingsRatio[0]}%</span>
              </div>
              <Slider
                value={savingsRatio}
                onValueChange={setSavingsRatio}
                max={100}
                step={5}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">Emergency fund, investments, goals</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Current total: <span className="text-[#F59E0B]">
                  {needsRatio[0] + wantsRatio[0] + savingsRatio[0]}%
                </span>
                {needsRatio[0] + wantsRatio[0] + savingsRatio[0] !== 100 && (
                  <span className="ml-2 text-[#EF4444]">
                    (Must equal 100%)
                  </span>
                )}
              </p>
            </div>
            
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              Save Budget Rules
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* AI Memory Control */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">AI & Privacy</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#1F2937]">Personalized Insights</div>
                <div className="text-sm text-gray-500">
                  Allow AI to remember your preferences
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#1F2937]">Transaction Analysis</div>
                <div className="text-sm text-gray-500">
                  Enable AI to analyze spending patterns
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <Button variant="outline" className="text-red-500 hover:text-red-600">
              Clear AI Memory
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#1F2937]">Dark Mode</div>
              <div className="text-sm text-gray-500">
                Switch to dark theme
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6">
          <Button variant="destructive" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
