/**
 * Coordinator Worklist
 * 
 * Professional workflow management interface for follow-up coordination.
 * Features bulk actions, priority views, and communication logging.
 */

import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import type { WorklistResponse, WorklistItem } from '../types'
import { 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-600' },
]

const PRIORITY_STYLES = {
  stat: 'border-l-4 border-l-red-500 bg-red-50',
  urgent: 'border-l-4 border-l-amber-500 bg-amber-50',
  routine: '',
}

export default function WorklistPage() {
  const [worklist, setWorklist] = useState<WorklistResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending', 'scheduled'])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Stats calculation
  const stats = useMemo(() => {
    if (!worklist) return { total: 0, overdue: 0, dueToday: 0, stat: 0 }
    const items = worklist.items
    return {
      total: items.length,
      overdue: items.filter(i => i.is_overdue).length,
      dueToday: items.filter(i => i.days_until_due === 0).length,
      stat: items.filter(i => i.followup.priority === 'stat').length,
    }
  }, [worklist])

  const fetchWorklist = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const params = new URLSearchParams()
      statusFilter.forEach((s) => params.append('status', s))
      const data = await api.get<WorklistResponse>(`/followups/worklist?${params}`)
      setWorklist(data)
    } catch (error) {
      console.error('Failed to fetch worklist:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWorklist()
  }, [statusFilter])

  const handleStatusChange = async (item: WorklistItem, newStatus: string) => {
    try {
      await api.patch(`/followups/${item.followup.id}/status`, {
        status: newStatus,
        note: `Status updated to ${newStatus}`,
      })
      fetchWorklist(true)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (!worklist) return
    if (selectedItems.size === worklist.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(worklist.items.map(i => i.followup.id)))
    }
  }

  const getStatusStyle = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-600'
  }

  const filteredItems = useMemo(() => {
    if (!worklist) return []
    if (!searchQuery) return worklist.items
    
    const query = searchQuery.toLowerCase()
    return worklist.items.filter(item => 
      item.patient_name?.toLowerCase().includes(query) ||
      item.patient_mrn?.toLowerCase().includes(query) ||
      item.followup.recommended_modality.toLowerCase().includes(query)
    )
  }, [worklist, searchQuery])

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Follow-up Worklist</h1>
            <p className="text-sm text-slate-500">{worklist?.total_count || 0} total items</p>
          </div>
          <button
            onClick={() => fetchWorklist(true)}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Calendar size={14} className="text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
          
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={14} className="text-red-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-slate-500">Overdue</p>
              </div>
            </div>
          )}
          
          {stats.dueToday > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-amber-600">{stats.dueToday}</p>
                <p className="text-xs text-slate-500">Due Today</p>
              </div>
            </div>
          )}
          
          {stats.stat > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={14} className="text-red-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600">{stats.stat}</p>
                <p className="text-xs text-slate-500">STAT</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, MRN, or modality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm border rounded-md flex items-center gap-2 ${
              showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Filter size={14} />
            Filters
            <ChevronDown size={14} className={showFilters ? 'rotate-180' : ''} />
          </button>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="text-sm text-slate-600">{selectedItems.size} selected</span>
              <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md">
                Mark Scheduled
              </button>
              <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md">
                Send Reminder
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Status:</span>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() =>
                    setStatusFilter((prev) =>
                      prev.includes(status.value)
                        ? prev.filter((s) => s !== status.value)
                        : [...prev, status.value]
                    )
                  }
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    statusFilter.includes(status.value)
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Study
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((item) => {
                const priority = item.followup.priority as keyof typeof PRIORITY_STYLES
                const priorityStyle = PRIORITY_STYLES[priority] || ''
                
                return (
                  <tr 
                    key={item.followup.id} 
                    className={`hover:bg-slate-50 ${priorityStyle} ${item.is_overdue ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.followup.id)}
                        onChange={() => toggleSelectItem(item.followup.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.patient_name || 'Unknown Patient'}
                        </p>
                        <p className="text-xs text-slate-500">{item.patient_mrn || 'No MRN'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-900">
                          {item.followup.recommended_modality} {item.followup.body_region}
                        </p>
                        {priority !== 'routine' && (
                          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${
                            priority === 'stat' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`text-sm ${item.is_overdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                          {item.followup.due_date
                            ? new Date(item.followup.due_date).toLocaleDateString()
                            : 'Not set'}
                        </p>
                        {item.days_until_due !== undefined && (
                          <p className={`text-xs ${item.is_overdue ? 'text-red-500' : 'text-slate-500'}`}>
                            {item.is_overdue
                              ? `${Math.abs(item.days_until_due)} days overdue`
                              : item.days_until_due === 0
                              ? 'Due today'
                              : `${item.days_until_due} days`}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusStyle(item.followup.status)}`}>
                        {item.is_overdue ? 'Overdue' : item.followup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={item.followup.status}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
                          className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <button 
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          title="Call patient"
                        >
                          <Phone size={14} />
                        </button>
                        <button 
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          title="Email reminder"
                        >
                          <Mail size={14} />
                        </button>
                        <button 
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          title="More actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No follow-ups match your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
