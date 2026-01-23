'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import {
  getAuditLogs,
  formatAuditAction,
  formatEntityType,
  getActionColor,
  calculateDiff,
  AuditLogRecord,
  AuditAction,
  AuditEntityType,
} from '@/lib/audit-log'
import { Button } from '@/components/ui/button'
import {
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function AuditLogsPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<AuditEntityType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Expanded log details
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!user?.institution_id) return

    setIsLoading(true)
    const result = await getAuditLogs(user.institution_id, {
      page,
      limit: 20,
      action: actionFilter || undefined,
      entityType: entityTypeFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    setLogs(result.data)
    setTotalPages(result.totalPages)
    setTotal(result.total)
    setIsLoading(false)
  }, [user?.institution_id, page, actionFilter, entityTypeFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const clearFilters = () => {
    setActionFilter('')
    setEntityTypeFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasActiveFilters = actionFilter || entityTypeFilter || startDate || endDate

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
              <p className="mt-1 text-sm text-gray-500">Track all changes made to your center&apos;s data</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-2 h-2 rounded-full bg-blue-600" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value as AuditAction | '')
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value as AuditEntityType | '')
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="payment">Payment</option>
                <option value="user">User</option>
                <option value="subject">Subject</option>
                <option value="fee">Fee</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters} leftIcon={<X className="w-4 h-4" />}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-500">
        Showing {logs.length} of {total} entries
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Audit logs will appear here when changes are made'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const isExpanded = expandedLog === log.id
              const changes = calculateDiff(log.old_values, log.new_values)

              return (
                <div key={log.id} className="hover:bg-gray-50">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action as AuditAction)}`}>
                          {formatAuditAction(log.action as AuditAction)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatEntityType(log.entity_type as AuditEntityType)}
                          </p>
                          <p className="text-sm text-gray-500">ID: {log.entity_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {log.user?.full_name || 'Unknown User'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        {(log.old_values || log.new_values) && (
                          isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && changes.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4 ml-16">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Changes</h4>
                        <div className="space-y-2">
                          {changes.map((change, i) => (
                            <div key={i} className="grid grid-cols-3 gap-4 text-sm">
                              <div className="font-medium text-gray-600">{change.field}</div>
                              <div className="text-red-600 line-through">
                                {change.oldValue !== undefined ? String(change.oldValue) : '-'}
                              </div>
                              <div className="text-green-600">
                                {change.newValue !== undefined ? String(change.newValue) : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
