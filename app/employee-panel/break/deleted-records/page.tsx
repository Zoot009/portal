"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeletedBreakRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  breakDate: string;
  breakInTime: string;
  breakOutTime: string;
  breakDuration: number;
  deleteReason: string;
  deletedBy: string;
  deletedByRole: string;
  deletedAt: string;
  originalBreakId: string;
}

export default function EmployeeDeletedBreaksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: deletedBreaks = [], isLoading } = useQuery<DeletedBreakRecord[]>({
    queryKey: ["employee-deleted-breaks"],
    queryFn: async () => {
      const response = await fetch("/api/breaks/deleted");
      if (!response.ok) {
        throw new Error("Failed to fetch deleted breaks");
      }
      return response.json();
    },
  });

  // Filter breaks
  const filteredBreaks = deletedBreaks.filter((breakRecord) => {
    const matchesSearch =
      breakRecord.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breakRecord.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = dateFilter
      ? breakRecord.breakDate === dateFilter
      : true;

    return matchesSearch && matchesDate;
  });

  // Calculate statistics
  const totalDeleted = deletedBreaks.length;
  const deletedToday = deletedBreaks.filter(
    (b) => format(new Date(b.deletedAt), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;
  const totalDuration = deletedBreaks.reduce(
    (acc, b) => acc + b.breakDuration,
    0
  );

  // Pagination
  const totalPages = Math.ceil(filteredBreaks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBreaks = filteredBreaks.slice(startIndex, endIndex);

  const formatTime = (dateTimeString: string) => {
    return format(new Date(dateTimeString), "hh:mm a");
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading deleted breaks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Deleted Breaks</h1>
        <p className="text-muted-foreground">
          View your break records that have been deleted by administrators
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deleted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalDeleted}</div>
            <p className="text-xs text-muted-foreground">
              Break records deleted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Deleted Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{deletedToday}</div>
            <p className="text-xs text-muted-foreground">
              Records deleted today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Duration Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(totalDuration)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total break time deleted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Deleted Breaks</CardTitle>
          <CardDescription>
            Search and filter your deleted break records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deleted Breaks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deleted Break Records</CardTitle>
          <CardDescription>
            {filteredBreaks.length} record(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Break Date</TableHead>
                  <TableHead>Break In</TableHead>
                  <TableHead>Break Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Delete Reason</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBreaks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No deleted breaks found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBreaks.map((breakRecord) => (
                    <TableRow key={breakRecord.id}>
                      <TableCell>
                        <Badge variant="destructive">Deleted</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(breakRecord.breakDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{formatTime(breakRecord.breakInTime)}</TableCell>
                      <TableCell>{formatTime(breakRecord.breakOutTime)}</TableCell>
                      <TableCell>{formatDuration(breakRecord.breakDuration)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm">{breakRecord.deleteReason}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{breakRecord.deletedBy}</p>
                          <p className="text-muted-foreground text-xs">
                            {breakRecord.deletedByRole}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(breakRecord.deletedAt), "MMM dd, yyyy")}</p>
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(breakRecord.deletedAt), "hh:mm a")}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredBreaks.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredBreaks.length)} of{" "}
                  {filteredBreaks.length} records
                </p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
