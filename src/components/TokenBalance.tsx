import React from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Coins, Plus, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface TokenBalanceProps {
  tokens: number
  onPurchaseTokens: () => void
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({ tokens, onPurchaseTokens }) => {
  const { user } = useAuth()
  
  const getTokenStatus = () => {
    if (tokens <= 0) return { color: 'destructive', icon: AlertTriangle, text: 'No tokens' }
    if (tokens <= 10) return { color: 'warning', icon: AlertTriangle, text: 'Low tokens' }
    return { color: 'default', icon: Coins, text: 'Available' }
  }

  const status = getTokenStatus()
  const StatusIcon = status.icon

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <StatusIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Token Balance</p>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{tokens.toLocaleString()}</span>
                <Badge variant={status.color as any} className="text-xs">
                  {status.text}
                </Badge>
              </div>
            </div>
          </div>
          
          {tokens <= 20 && (
            <Button 
              onClick={onPurchaseTokens}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Buy Tokens</span>
            </Button>
          )}
        </div>
        
        {user && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Logged in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}