import { useState, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Download, RefreshCw, ArrowUpRight, ArrowDownRight, AlertCircle, Loader2 } from 'lucide-react'
import { useBank } from '../contexts/BankContext'
import { useAuth } from '../contexts/AuthContext'
import { setuApi } from '../api'
import type { Transaction as BankTransaction } from '../contexts/BankContext'


export function TransactionsPage() {
  const { user } = useAuth()
  const { transactions, refreshData } = useBank()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchMessage, setFetchMessage] = useState('')
  const [hoveredTransaction, setHoveredTransaction] = useState<BankTransaction | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)

  const formatConfidenceScore = (score?: number) => {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 'N/A'
    }
    return `${Math.round(score * 100)}%`
  }

  const handleHoverStart = (transaction: BankTransaction, event: MouseEvent<HTMLTableRowElement>) => {
    setHoveredTransaction(transaction)
    setHoverPosition({ x: event.clientX, y: event.clientY })
  }

  const handleHoverMove = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!hoveredTransaction) return
    setHoverPosition({ x: event.clientX, y: event.clientY })
  }

  const clearHover = () => {
    setHoveredTransaction(null)
    setHoverPosition(null)
  }

  const handleFetchTransactions = async () => {
    if (!user) return

    setIsFetching(true)
    setFetchMessage('Fetching transactions from your bank accounts...')

    try {
      // Get user's active consents
      const consentsResponse = await setuApi.getUserConsents(user.uid)
      
      if (!consentsResponse.success || !consentsResponse.data) {
        throw new Error('No active bank connections found')
      }

      const activeConsents = (consentsResponse.data as Array<{ consentId: string; status: string }>).filter((consent) => consent.status === 'ACTIVE')
      
      if (activeConsents.length === 0) {
        throw new Error('No active bank connections found. Please connect your bank account first.')
      }

      let totalFetched = 0

      // Determine date range based on existing transactions
      let fromDate: string | undefined
      if (transactions.length > 0) {
        // Find the most recent transaction date and fetch from the next day
        const mostRecentDate = Math.max(...transactions.map(t => new Date(t.date).getTime()))
        const nextDay = new Date(mostRecentDate)
        nextDay.setDate(nextDay.getDate() + 1)
        fromDate = nextDay.toISOString().split('T')[0] + 'T00:00:00Z'
        setFetchMessage('Fetching latest transactions since your last transaction...')
      }

      // Fetch transactions for each active consent
      for (const consent of activeConsents) {
        try {
          const response = await setuApi.fetchTransactions(consent.consentId, user.uid, fromDate)
          
          if (response.success && response.data) {
            // Transactions are automatically saved to Firestore by the backend
            // We just need to refresh the local data
            totalFetched++
          }
        } catch (error) {
          console.warn(`Failed to fetch transactions for consent ${consent.consentId}:`, error)
        }
      }

      if (totalFetched > 0) {
        // Refresh the bank data to show new transactions
        await refreshData()
        const message = transactions.length > 0 
          ? `Successfully fetched latest transactions from ${totalFetched} account(s)!`
          : `Successfully fetched transactions from ${totalFetched} account(s)!`
        setFetchMessage(message)
      } else {
        setFetchMessage('No new transactions found. Try again later.')
      }

    } catch (error) {
      setFetchMessage(error instanceof Error ? error.message : 'Failed to fetch transactions')
    } finally {
      setIsFetching(false)
      // Clear message after 5 seconds
      setTimeout(() => setFetchMessage(''), 5000)
    }
  }

  // Show empty state if no transactions
  if (transactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[#1F2937] mb-2">Transactions</h1>
          <p className="text-gray-600">View and manage your bank transactions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">No Transactions Yet</h3>
            <p className="text-gray-600 mb-6">
              Connect your bank accounts or add transactions manually to get started.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleFetchTransactions} disabled={isFetching}>
                {isFetching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Fetch Transactions
              </Button>
              <Button variant="outline">
                Add Transaction
              </Button>
            </div>
            {fetchMessage && (
              <p className="text-sm text-gray-600 mt-4">{fetchMessage}</p>
            )}
          </Card>
        </motion.div>
      </div>
    )
  }

  const filteredTransactions = transactions.filter((t) => {
    if (selectedCategory !== 'all' && t.category.toLowerCase() !== selectedCategory) {
      return false
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[#1F2937] mb-2">Transactions</h1>
        <p className="text-gray-600">View and manage your bank transactions</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-gray-600 mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="income">Income</option>
                <option value="groceries">Groceries</option>
                <option value="dining">Dining</option>
                <option value="transport">Transport</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={handleFetchTransactions} disabled={isFetching} variant="outline">
                {isFetching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Fetch Transactions
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Sheets
              </Button>
            </div>
          </div>
          {fetchMessage && (
            <p className="text-sm text-gray-600 mt-4">{fetchMessage}</p>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6">
          <h2 className="text-[#1F2937] mb-4">Recent Transactions ({filteredTransactions.length})</h2>
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
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer"
                    onMouseEnter={(event) => handleHoverStart(transaction, event)}
                    onMouseMove={handleHoverMove}
                    onMouseLeave={clearHover}
                  >
                    <TableCell>{transaction.date.toLocaleDateString()}</TableCell>
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
                    <TableCell>{transaction.refinedMerchant || transaction.merchant}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className={`text-right ${transaction.type === 'credit' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>
      <AnimatePresence>
        {hoveredTransaction && hoverPosition && (
          <motion.div
            key={hoveredTransaction.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-40 pointer-events-none"
            style={{
              top: Math.min(
                (hoverPosition.y ?? 0) + 24,
                (typeof window !== 'undefined' ? window.innerHeight - 180 : hoverPosition.y ?? 0)
              ),
              left: Math.min(
                (hoverPosition.x ?? 0) + 24,
                (typeof window !== 'undefined' ? window.innerWidth - 320 : hoverPosition.x ?? 0)
              ),
              width: 'min(320px, calc(100vw - 32px))'
            }}
          >
            <Card className="p-4 shadow-2xl border-gray-200 bg-white/95 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">AI Insights</p>
              <p className="text-[#1F2937] text-sm mb-3">
                {hoveredTransaction.aiInsights || 'AI insights unavailable for this transaction.'}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Confidence</span>
                <span className="font-semibold text-[#4F46E5]">
                  {formatConfidenceScore(hoveredTransaction.confidenceScore)}
                </span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}