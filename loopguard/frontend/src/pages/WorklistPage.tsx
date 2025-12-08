/**
 * Enhanced Worklist Page
 * 
 * Features:
 * - Overdue highlighting and badges
 * - Priority indicators
 * - Quick actions
 * - Statistics bar
 */

import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import type { WorklistResponse, WorklistItem } from '../types'
import { Search, Filter, CheckCircle, Clock, XCircle, AlertTriangle, Calendar } from 'lucide-react'

const STATUS_OPTIONS = ['pending', 'scheduled', 'completed', 'cancelled']
const PRIORITY_COLORS = {
  stat: 'bg-red-100 text-red-700 border-red-300',
  urgent: 'bg-orange-100 text-orange-700 border-orange-300',
  routine: 'bg-gray-100 text-gray-700 border-gray-300',
}

export default function WorklistPage() {
  const [worklist, setWorklist] = useState<WorklistResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending', 'scheduled'])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority'>('due_date')

  // Calculate statistics
  const stats = useMemo(() => {
    if (!worklist) return { total: 0, overdue: 0, dueThisWeek: 0, stat: 0 }
    const items = worklist.items
    return {
      total: items.length,
      overdue: items.filter(i => i.is_overdue).length,
      dueThisWeek: items.filter(i => i.days_until_due !== undefined && i.days_until_due <= 7 && i.days_until_due > 0).length,
      stat: items.filter(i => i.followup.priority === 'stat').length,
    }
  }, [worklist])

  const fetchWorklist = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      statusFilter.forEach((s) => params.append('status', s))
      const data = await api.get<WorklistResponse>(`/followups/worklist?${params}`)
      setWorklist(data)
    } catch (error) {
      console.error('Failed to fetch worklist:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorklist()
  }, [statusFilter])

  const handleStatusChange = async (item: WorklistItem, newStatus: string) => {
    try {
      await api.patch(`/followups/${item.followup.id}/status`, {
        status: newStatus,
        note: `Status changed to ${newStatus}`,
      })
      fetchWorklist()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const getStatusIcon = (status: string, isOverdue: boolean) => {
    if (isOverdue) return <XCircle className="text-red-500" size={18} />
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />
      case 'scheduled':
        return <Clock className="text-blue-500" size={18} />
      default:
        return <Clock className="text-yellow-500" size={18} />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Follow-up Worklist</h1>
        <span className="text-sm text-gray-500">
          {worklist?.total_count ?? 0} items
        </span>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Active</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{stats.dueThisWeek}</p>
            <p className="text-xs text-gray-500">Due This Week</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <XCircle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.stat}</p>
            <p className="text-xs text-gray-500">STAT Priority</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'due_date' | 'priority')}
            className="input w-auto text-sm"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev.includes(status)
                      ? prev.filter((s) => s !== status)
                      : [...prev, status]
                  )
                }
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  statusFilter.includes(status)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Worklist Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : worklist && worklist.items.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Modality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Body Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {worklist.items.map((item) => {
                const priority = item.followup.priority as keyof typeof PRIORITY_COLORS
                const rowClass = item.is_overdue 
                  ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                
                return (
                <tr key={item.followup.id} className={rowClass}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.followup.status, item.is_overdue)}
                      <div>
                        <span
                          className={`text-sm font-medium ${
                            item.is_overdue ? 'text-red-600' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {item.is_overdue ? 'Overdue' : item.followup.status}
                        </span>
                        {priority && priority !== 'routine' && (
                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded border ${PRIORITY_COLORS[priority]}`}>
                            {priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.patient_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.patient_mrn || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {item.followup.recommended_modality}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {item.followup.body_region}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">
                        {item.followup.due_date
                          ? new Date(item.followup.due_date).toLocaleDateString()
                          : '-'}
                      </p>
                      {item.days_until_due !== undefined && (
                        <p
                          className={`text-xs ${
                            item.is_overdue ? 'text-red-500' : 'text-gray-500'
                          }`}
                        >
                          {item.is_overdue
                            ? `${Math.abs(item.days_until_due)} days overdue`
                            : `${item.days_until_due} days`}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={item.followup.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )})}
            
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No follow-ups found matching your filters
          </div>
        )}
      </div>
    </div>
  )
}
