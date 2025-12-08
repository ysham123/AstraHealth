/**
 * Analytics Service - Production Ready
 * 
 * All data fetched from API - no mock data.
 * Provides interfaces and async fetch functions.
 */

import { api } from '../api/client'

// Types
export interface StudyRecord {
  id: string
  date: string
  modality: 'CT' | 'MRI' | 'US' | 'XR' | 'NM'
  read_time_minutes: number
  has_critical_finding: boolean
  has_followup_recommendation: boolean
}

export interface FollowupRecord {
  id: string
  created_date: string
  due_date: string
  completed_date: string | null
  status: 'pending' | 'completed' | 'overdue' | 'cancelled'
  outcome: 'malignant' | 'benign' | 'indeterminate' | null
  modality: string
  body_region: string
}

export interface CriticalFinding {
  id: number
  patient_name: string
  patient: string  // Alias for frontend compatibility
  finding: string
  study_type: string
  study: string  // Alias for frontend compatibility
  timestamp: string
  severity: 'stat' | 'urgent'
  communicated: boolean
}

export interface QAAlert {
  id: number
  type: 'laterality' | 'recommendation' | 'measurement' | 'comparison'
  message: string
  study: string
  dismissed: boolean
}

export interface Analytics {
  total_studies: number
  studies_this_week: number
  week_over_week_change: number
  avg_read_time: number
  critical_findings_count: number
  pending_followups: number
  overdue_followups: number
  completed_followups: number
  total_followups: number
  compliance_rate: number
  outcomes: {
    malignant: number
    benign: number
    indeterminate: number
    lost_to_followup: number
  }
  modality_stats: Array<{ modality: string; count: number; avg_time: number }>
  weekly_data: Array<{ week: string; studies: number; avg_time: number }>
  impact_score: number
}

// Default empty analytics for loading state
const emptyAnalytics: Analytics = {
  total_studies: 0,
  studies_this_week: 0,
  week_over_week_change: 0,
  avg_read_time: 0,
  critical_findings_count: 0,
  pending_followups: 0,
  overdue_followups: 0,
  completed_followups: 0,
  total_followups: 0,
  compliance_rate: 0,
  outcomes: { malignant: 0, benign: 0, indeterminate: 0, lost_to_followup: 0 },
  modality_stats: [],
  weekly_data: [],
  impact_score: 0,
}

// Fetch analytics from API
export async function fetchAnalytics(): Promise<Analytics> {
  try {
    const data = await api.get<Analytics>('/metrics/analytics')
    return data
  } catch (err) {
    console.error('Failed to fetch analytics:', err)
    return emptyAnalytics
  }
}

// Fetch critical findings from API
export async function fetchCriticalFindings(): Promise<CriticalFinding[]> {
  try {
    const data = await api.get<{ findings: CriticalFinding[] }>('/metrics/critical-findings')
    // Add aliases for frontend compatibility
    return (data.findings || []).map(f => ({
      ...f,
      patient: f.patient_name,
      study: f.study_type
    }))
  } catch (err) {
    console.error('Failed to fetch critical findings:', err)
    return []
  }
}

// Fetch QA alerts from API
export async function fetchQAAlerts(): Promise<QAAlert[]> {
  try {
    const data = await api.get<{ alerts: QAAlert[] }>('/metrics/qa-alerts')
    return data.alerts || []
  } catch (err) {
    console.error('Failed to fetch QA alerts:', err)
    return []
  }
}

// Mark critical finding as communicated
export async function markCommunicated(id: number): Promise<void> {
  try {
    await api.patch(`/metrics/critical-findings/${id}/communicate`, {})
  } catch (err) {
    console.error('Failed to mark communicated:', err)
  }
}

// Dismiss QA alert
export async function dismissAlert(id: number): Promise<void> {
  try {
    await api.patch(`/metrics/qa-alerts/${id}/dismiss`, {})
  } catch (err) {
    console.error('Failed to dismiss alert:', err)
  }
}

// Get time ago string (utility, no data)
export function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

// Legacy sync functions for backwards compatibility (return empty data)
// Components should migrate to async fetch functions
export function getAnalytics(): Analytics {
  return emptyAnalytics
}

export function getCriticalFindings(): CriticalFinding[] {
  return []
}

export function getQAAlerts(): QAAlert[] {
  return []
}
