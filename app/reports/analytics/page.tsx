import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function AnalyticsReportPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Present</span>
              <span>85%</span>
            </div>
            <Progress value={85} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Absent</span>
              <span>15%</span>
            </div>
            <Progress value={15} className="bg-red-100" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employee Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Engineering</span>
            <span>45 employees</span>
          </div>
          <div className="flex justify-between">
            <span>Sales</span>
            <span>28 employees</span>
          </div>
          <div className="flex justify-between">
            <span>Marketing</span>
            <span>18 employees</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Annual Leave</span>
            <span>68 requests</span>
          </div>
          <div className="flex justify-between">
            <span>Sick Leave</span>
            <span>42 requests</span>
          </div>
          <div className="flex justify-between">
            <span>Work From Home</span>
            <span>31 requests</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Asset Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Laptops</span>
            <span>89 units</span>
          </div>
          <div className="flex justify-between">
            <span>Monitors</span>
            <span>95 units</span>
          </div>
          <div className="flex justify-between">
            <span>Mobile Devices</span>
            <span>45 units</span>
          </div>
        </CardContent>
      </Card>
      <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
        <Button variant="outline">Export Analytics</Button>
      </div>
    </div>
  );
}
