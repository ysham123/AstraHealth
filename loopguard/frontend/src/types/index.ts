/**
 * TypeScript Types
 * 
 * Mirrors backend Pydantic schemas.
 */

export interface User {
  id: string
  email: string
  display_name: string
  role: 'radiologist' | 'coordinator' | 'admin'
  site_id?: string
  is_active: boolean
  created_at?: string
  last_login_at?: string
}

export interface FollowUp {
  id: string
  report_id: string
  patient_id: string
  recommended_modality: string
  body_region: string
  reason: string
  interval_months: number
  due_date?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  priority: 'routine' | 'urgent' | 'stat'
  assigned_to?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  days_until_due?: number
  is_overdue?: boolean
}

export interface WorklistItem {
  followup: FollowUp
  patient_name: string
  patient_mrn: string
  days_until_due?: number
  is_overdue: boolean
}

export interface WorklistResponse {
  items: WorklistItem[]
  total_count: number
  has_more: boolean
}

export interface StatusBreakdown {
  pending: number
  scheduled: number
  completed: number
  cancelled: number
  overdue: number
}

export interface ModalityBreakdown {
  modality: string
  count: number
  completed_on_time: number
  completed_late: number
}

export interface Metrics {
  time_range_start: string
  time_range_end: string
  total_followups: number
  total_completed: number
  total_overdue: number
  completion_rate: number
  overdue_rate: number
  status_breakdown: StatusBreakdown
  modality_breakdown: ModalityBreakdown[]
}
