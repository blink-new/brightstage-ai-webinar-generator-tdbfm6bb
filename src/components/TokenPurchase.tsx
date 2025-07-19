import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Check, Coins, CreditCard, Zap } from 'lucide-react'
import { toast } from './ui/use-toast'

interface TokenPackage {
  id: string
  tokens: number
  price: number
  popular?: boolean
  bonus?: number
}

interface TokenPurchaseProps {
  isOpen: boolean
  onClose: () => void
  onPurchaseComplete: (tokens: number) => void
}

const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'starter', tokens: 100, price: 9.99 },
  { id: 'popular', tokens: 500, price: 39.99, popular: true, bonus: 50 },
  { id: 'pro', tokens: 1000, price: 69.99, bonus: 200 },
  { id: 'enterprise', tokens: 2500, price: 149.99, bonus: 750 }
]

export const TokenPurchase: React.FC<TokenPurchaseProps> = ({ 
  isOpen, 
  onClose, 
  onPurchaseComplete 
}) => {
  const [selectedPackage, setSelectedPackage] = useState<string>('popular')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePurchase = async () => {
    const pkg = TOKEN_PACKAGES.find(p => p.id === selectedPackage)
    if (!pkg) return

    setIsProcessing(true)
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const totalTokens = pkg.tokens + (pkg.bonus || 0)
      onPurchaseComplete(totalTokens)
      
      toast({
        title: "Purchase Successful!",
        description: `${totalTokens.toLocaleString()} tokens added to your account.`,
      })
      
      onClose()
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-6 w-6 text-primary" />
            <span>Purchase Tokens</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedPackage === pkg.id 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              } ${pkg.popular ? 'relative' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg capitalize">{pkg.id}</CardTitle>
                <div className="text-3xl font-bold text-primary">
                  ${pkg.price}
                </div>
              </CardHeader>
              
              <CardContent className="text-center space-y-3">
                <div className="space-y-1">
                  <div className="text-2xl font-semibold">
                    {pkg.tokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Base Tokens</div>
                </div>
                
                {pkg.bonus && (
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-accent flex items-center justify-center">
                      <Zap className="h-4 w-4 mr-1" />
                      +{pkg.bonus.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Bonus Tokens</div>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="text-lg font-bold">
                    {(pkg.tokens + (pkg.bonus || 0)).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Total Tokens</div>
                </div>
                
                <div className="text-xs text-gray-500">
                  ${(pkg.price / (pkg.tokens + (pkg.bonus || 0)) * 100).toFixed(2)} per 100 tokens
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">What can you do with tokens?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Generate webinar content (~10 tokens)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Create slides with AI (~15 tokens)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Generate voice narration (~20 tokens)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Create video output (~25 tokens)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={isProcessing}
            className="flex items-center space-x-2"
          >
            <CreditCard className="h-4 w-4" />
            <span>
              {isProcessing ? 'Processing...' : `Purchase ${selectedPackage} Package`}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}