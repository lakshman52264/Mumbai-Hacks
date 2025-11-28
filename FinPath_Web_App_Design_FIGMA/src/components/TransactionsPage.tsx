import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Download, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  merchant: string;
  category: string;
  amount: number;
}

const exampleSMS = [
  'Credit ₹2000 from Swiggy',
  'Debit ₹500 Amazon',
  'Debit ₹150 Uber',
];

const initialTransactions: Transaction[] = [
  { id: '1', date: '2025-11-08', type: 'debit', merchant: 'Amazon', category: 'Shopping', amount: 1250 },
  { id: '2', date: '2025-11-07', type: 'credit', merchant: 'Salary', category: 'Income', amount: 45000 },
  { id: '3', date: '2025-11-06', type: 'debit', merchant: 'Swiggy', category: 'Dining', amount: 420 },
  { id: '4', date: '2025-11-05', type: 'debit', merchant: 'Uber', category: 'Transport', amount: 180 },
  { id: '5', date: '2025-11-04', type: 'debit', merchant: 'Netflix', category: 'Entertainment', amount: 649 },
  { id: '6', date: '2025-11-03', type: 'debit', merchant: 'Big Bazaar', category: 'Groceries', amount: 2100 },
  { id: '7', date: '2025-11-02', type: 'debit', merchant: 'Zomato', category: 'Dining', amount: 580 },
  { id: '8', date: '2025-11-01', type: 'credit', merchant: 'Freelance', category: 'Income', amount: 8500 },
];

export function TransactionsPage() {
  const [smsText, setSmsText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [selectedMonth, setSelectedMonth] = useState('november');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const parseSMS = () => {
    if (!smsText.trim()) return;

    const isCredit = smsText.toLowerCase().includes('credit');
    const isDebit = smsText.toLowerCase().includes('debit');
    
    if (!isCredit && !isDebit) {
      alert('Please include "Credit" or "Debit" in the message');
      return;
    }

    // Simple parsing logic
    const amountMatch = smsText.match(/₹?\s?(\d+(?:,\d+)*)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(',', '')) : 0;
    
    // Extract merchant name (text between type and amount or after amount)
    let merchant = 'Unknown';
    const words = smsText.split(' ');
    const typeIndex = words.findIndex(w => w.toLowerCase().includes('credit') || w.toLowerCase().includes('debit'));
    if (typeIndex >= 0 && words[typeIndex + 1]) {
      merchant = words.slice(typeIndex + 1).join(' ').replace(/₹?\d+/g, '').trim() || 'Unknown';
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      type: isCredit ? 'credit' : 'debit',
      merchant: merchant,
      category: isCredit ? 'Income' : 'Shopping',
      amount: amount,
    };

    setTransactions([newTransaction, ...transactions]);
    setSmsText('');
  };

  const filteredTransactions = transactions.filter(t => {
    if (selectedCategory !== 'all' && t.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[#1F2937] mb-2">Transactions</h1>
        <p className="text-gray-600">Parse SMS messages and manage your transactions</p>
      </motion.div>

      {/* SMS Simulator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#4F46E5]" />
            <h2 className="text-[#1F2937]">SMS Transaction Parser</h2>
          </div>
          
          <div className="space-y-4">
            <Textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Paste your bank SMS here... (e.g., 'Credit ₹2000 from Swiggy' or 'Debit ₹500 Amazon')"
              className="min-h-[100px]"
            />
            
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Try examples:</span>
              {exampleSMS.map((example) => (
                <Badge
                  key={example}
                  variant="outline"
                  className="cursor-pointer hover:bg-indigo-50 hover:text-[#4F46E5] hover:border-[#4F46E5]"
                  onClick={() => setSmsText(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>

            <Button 
              onClick={parseSMS}
              className="bg-[#4F46E5] hover:bg-[#4338CA]"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Parse Message
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Filters and Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-gray-600 mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="november">November 2025</SelectItem>
                  <SelectItem value="october">October 2025</SelectItem>
                  <SelectItem value="september">September 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-gray-600 mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="dining">Dining</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 items-end">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Sheets
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">
            Recent Transactions ({filteredTransactions.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.type === 'credit'
                            ? 'border-[#10B981] text-[#10B981]'
                            : 'border-[#EF4444] text-[#EF4444]'
                        }
                      >
                        {transaction.type === 'credit' ? (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        )}
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.merchant}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        transaction.type === 'credit'
                          ? 'text-[#10B981]'
                          : 'text-[#EF4444]'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
