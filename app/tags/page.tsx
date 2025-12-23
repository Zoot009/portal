'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/role-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, Plus, Edit, Trash2, Tag, MoreVertical, UserCheck, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TagData {
  id: number
  tagName: string
  timeMinutes: number
  category: string | null
  isActive: boolean
  createdAt: string
  _count: {
    assignments: number
    logs: number
  }
}

export default function TagsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null)

  const { data: tagsResponse, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      return response.json()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete tag')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Tag deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setDeleteDialogOpen(false)
      setTagToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete tag')
    },
  })

  const handleDeleteClick = (tag: TagData) => {
    setTagToDelete(tag)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (tagToDelete) {
      deleteMutation.mutate(tagToDelete.id)
    }
  }

  const tags = tagsResponse?.data || []

  // Calculate totals
  const totalAssignments = tags.reduce((sum: number, tag: TagData) => sum + (tag._count?.assignments || 0), 0)
  const totalWorkLogs = tags.reduce((sum: number, tag: TagData) => sum + (tag._count?.logs || 0), 0)

  const filteredTags = tags.filter((tag: TagData) => {
    return tag.tagName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Pagination
  const totalPages = Math.ceil(filteredTags.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTags = filteredTags.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages]
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      Development: 'bg-blue-500 text-white',
      'Quality Assurance': 'bg-purple-500 text-white',
      Communication: 'bg-green-500 text-white',
      Documentation: 'bg-orange-500 text-white',
      Testing: 'bg-pink-500 text-white',
      Deployment: 'bg-red-500 text-white',
    }
    return (
      <Badge className={categoryColors[category as keyof typeof categoryColors] || 'bg-gray-500 text-white'}>
        {category}
      </Badge>
    )
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tags Management</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="bg-card p-4 rounded-lg border">
              <div className="h-4 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-lg border p-8 text-center">
          <div className="text-muted-foreground">Loading tags...</div>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tags Management</h2>
          <p className="text-muted-foreground">
            {filteredTags.length} tags
          </p>
        </div>
        <Button asChild>
          <Link href="/tags/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tags</p>
              <p className="text-2xl font-bold">{tags?.length || 0}</p>
            </div>
            <Tag className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalAssignments}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Work Logs</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalWorkLogs}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-card p-4 rounded-lg border">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Tags Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground w-[35%]">Tag Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground w-[25%]">Time Allocated</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground w-[25%]">Created</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-muted-foreground text-center w-[15%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">No tags found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm 
                        ? 'Try adjusting your search'
                        : 'Get started by creating your first tag'
                      }
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTags.map((tag: TagData) => (
                <TableRow key={tag.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium w-[35%]">{tag.tagName}</TableCell>
                  <TableCell className="w-[25%]">
                    <div>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {formatTime(tag.timeMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tag.timeMinutes} mins
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground w-[25%]">
                    {new Date(tag.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-center w-[15%]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/tags/${tag.id}/edit`} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 cursor-pointer focus:text-red-600"
                          onClick={() => handleDeleteClick(tag)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredTags.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value))
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTags.length)} of {filteredTags.length} entries
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3"
              >
                Previous
              </Button>
              
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className="h-9 w-9"
                  >
                    {page}
                  </Button>
                )
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete?.tagName}"? This action cannot be undone.
              {tagToDelete && tagToDelete._count.assignments > 0 && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-orange-800 dark:text-orange-200">
                  ⚠️ This tag is assigned to {tagToDelete._count.assignments} employee(s).
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </RoleGuard>
  )
}
