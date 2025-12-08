/**
 * Dashboard Page
 * 
 * Overview of follow-up status and quick actions.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Metrics, WorklistResponse } from '../types'
import {
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [recentItems, setRecentItems] = useState<WorklistResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, worklistData] = await Promise.all([
          api.get<Metrics>('/metrics/followups?days=30').catch(() => null),
          api.get<WorklistResponse>('/followups/worklist?limit=5'),
        ])
        setMetrics(metricsData)
        setRecentItems(worklistData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Total Follow-ups',
      value: metrics?.total_followups ?? '-',
      icon: ClipboardList,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Pending',
      value: metrics?.status_breakdown.pending ?? '-',
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      label: 'Completed',
      value: metrics?.status_breakdown.completed ?? '-',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Overdue',
      value: metrics?.status_breakdown.overdue ?? '-',
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion Rate */}
      {metrics && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Completion Rate</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all"
                style={{ width: `${metrics.completion_rate}%` }}
              />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {metrics.completion_rate}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Last 30 days • {metrics.total_completed} of {metrics.total_followups} completed on time
          </p>
        </div>
      )}

      {/* Recent Follow-ups */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Follow-ups</h2>
          <Link
            to="/worklist"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {recentItems && recentItems.items.length > 0 ? (
          <div className="divide-y">
            {recentItems.items.map((item) => (
              <div key={item.followup.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.followup.recommended_modality} - {item.followup.body_region}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.patient_name || 'Patient'} • {item.patient_mrn || 'MRN'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      item.is_overdue
                        ? 'bg-red-100 text-red-700'
                        : item.followup.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {item.is_overdue ? 'Overdue' : item.followup.status}
                  </span>
                  {item.days_until_due !== undefined && !item.is_overdue && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due in {item.days_until_due} days
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No follow-ups found</p>
        )}
      </div>
    </div>
  )
}
