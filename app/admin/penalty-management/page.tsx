"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, AlertTriangle, TrendingUp, Users, Shield } from "lucide-react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface PenaltySettings {
  id: number
  warningThreshold: number
  penaltyAmount: number
  penaltyType: string
  autoCreate: boolean
  warningMessageTemplate: string | null
  penaltyMessageTemplate: string | null
  salaryDayStart: number
}

interface EmployeeStat {
  employee: {
    id: number
    name: string
    employeeCode: string
    email: string
    department: string
  }
  warningCount: number
  isAtRisk: boolean
  willGetPenalty: boolean
}

export default function PenaltyManagementPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<PenaltySettings>>({
    warningThreshold: 3,
    penaltyAmount: 500,
    penaltyType: "POLICY_VIOLATION",
    autoCreate: true,
    salaryDayStart: 6,
    warningMessageTemplate: "",
    penaltyMessageTemplate: "",
  })

  // Fetch penalty settings and stats
  const { data, isLoading, error } = useQuery({
    queryKey: ['penalty-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/penalty-settings')
      if (!response.ok) throw new Error('Failed to fetch penalty settings')
      return response.json()
    },
  })

  // Update form when data loads
  useEffect(() => {
    if (data?.data?.settings) {
      setFormData({
        warningThreshold: data.data.settings.warningThreshold || 3,
        penaltyAmount: data.data.settings.penaltyAmount || 500,
        penaltyType: data.data.settings.penaltyType || "POLICY_VIOLATION",
        autoCreate: data.data.settings.autoCreate !== undefined ? data.data.settings.autoCreate : true,
        salaryDayStart: data.data.settings.salaryDayStart || 6,
        warningMessageTemplate: data.data.settings.warningMessageTemplate || "",
        penaltyMessageTemplate: data.data.settings.penaltyMessageTemplate || "",
      })
    }
  }, [data])

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedData: Partial<PenaltySettings>) => {
      const response = await fetch('/api/admin/penalty-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      if (!response.ok) throw new Error('Failed to update settings')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Penalty settings updated successfully')
      queryClient.invalidateQueries({ queryKey: ['penalty-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const settings = data?.data?.settings
  const currentCycle = data?.data?.currentCycle
  const stats = data?.data?.stats
  const employees: EmployeeStat[] = data?.data?.employees || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Penalty Management System</h1>
        <p className="text-muted-foreground mt-2">
          Configure automatic penalty rules for mandatory tag violations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning Threshold</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings?.warningThreshold}</div>
            <p className="text-xs text-muted-foreground">warnings before penalty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees with Warnings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployeesWithWarnings || 0}</div>
            <p className="text-xs text-muted-foreground">in current cycle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.employeesAtRisk || 0}</div>
            <p className="text-xs text-muted-foreground">close to threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Threshold</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.employeesOverThreshold || 0}</div>
            <p className="text-xs text-muted-foreground">pending penalty</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Cycle Info */}
      {currentCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Salary Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {new Date(currentCycle.startDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </Badge>
              <span className="text-muted-foreground">to</span>
              <Badge variant="outline" className="text-sm">
                {new Date(currentCycle.endDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">
                Warnings reset on {new Date(currentCycle.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Penalty Rules Configuration</CardTitle>
            <CardDescription>Set automatic penalty rules and thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warningThreshold">Warning Threshold</Label>
                <Input
                  id="warningThreshold"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.warningThreshold || 3}
                  onChange={(e) => setFormData({ ...formData, warningThreshold: parseInt(e.target.value) || 3 })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of warnings before automatic penalty (1-10)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="penaltyAmount">Penalty Amount (₹)</Label>
                <Input
                  id="penaltyAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.penaltyAmount || 500}
                  onChange={(e) => setFormData({ ...formData, penaltyAmount: parseFloat(e.target.value) || 500 })}
                />
                <p className="text-xs text-muted-foreground">
                  Default penalty amount for violations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="penaltyType">Penalty Type</Label>
                <Select
                  value={formData.penaltyType}
                  onValueChange={(value) => setFormData({ ...formData, penaltyType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLICY_VIOLATION">Policy Violation</SelectItem>
                    <SelectItem value="ATTENDANCE_DEDUCTION">Attendance Deduction</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryDayStart">Salary Cycle Start Day</Label>
                <Input
                  id="salaryDayStart"
                  type="number"
                  min="1"
                  max="28"
                  value={formData.salaryDayStart || 6}
                  onChange={(e) => setFormData({ ...formData, salaryDayStart: parseInt(e.target.value) || 6 })}
                />
                <p className="text-xs text-muted-foreground">
                  Day of the month when salary cycle starts (1-28)
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCreate">Auto-create Penalties</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create penalties when threshold is reached
                  </p>
                </div>
                <Switch
                  id="autoCreate"
                  checked={formData.autoCreate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreate: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="penaltyMessageTemplate">Penalty Message Template</Label>
                <Textarea
                  id="penaltyMessageTemplate"
                  placeholder="E.g., Penalty for repeated failure to complete mandatory tasks"
                  value={formData.penaltyMessageTemplate || ""}
                  onChange={(e) => setFormData({ ...formData, penaltyMessageTemplate: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{count}"} to insert warning count
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Employee Warning Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Warning Status</CardTitle>
            <CardDescription>Employees with warnings in current cycle</CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No employees with warnings in current cycle</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {employees.map((emp) => (
                  <div
                    key={emp.employee.id}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{emp.employee.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {emp.employee.employeeCode}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {emp.warningCount} / {settings?.warningThreshold} warnings
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
