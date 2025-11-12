'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, Sparkles, Trophy, Clock } from 'lucide-react'

export default function EmployeeGamificationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Rewards
          </h1>
          <p className="text-muted-foreground">
            Your personalized rewards and achievements hub
          </p>
        </div>

        <Card className="border-2 border-dashed border-purple-300 bg-white/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
              <Gift className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Coming Soon!</CardTitle>
            <CardDescription className="text-lg">
              We are building something amazing for you
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Get ready for an exciting rewards and gamification experience!
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors">
                  <Trophy className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
                  <h3 className="font-semibold mb-1">Earn Points</h3>
                  <p className="text-sm text-muted-foreground">
                    Get rewarded for your achievements
                  </p>
                </div>
                
                <div className="p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                  <h3 className="font-semibold mb-1">Unlock Rewards</h3>
                  <p className="text-sm text-muted-foreground">
                    Redeem exclusive benefits
                  </p>
                </div>
                
                <div className="p-4 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-colors">
                  <Clock className="w-8 h-8 mx-auto mb-3 text-green-500" />
                  <h3 className="font-semibold mb-1">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor your journey
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                <p className="font-medium text-purple-900">
                  🎉 Stay tuned! This feature will be available soon.
                </p>
                <p className="text-sm text-purple-700 mt-2">
                  We are working hard to bring you the best rewards experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a 
            href="/employee-panel" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
