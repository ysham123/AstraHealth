/**
 * Astra Health - Radiology Intelligence Dashboard
 * 
 * Professional dashboard tailored for radiologists:
 * - Personalized welcome
 * - Critical Results Communication
 * - Report QA Assistant
 * - Personal Analytics & Impact
 * - Follow-up tracking
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ChevronRight,
  Activity,
  Phone,
  FileCheck,
  TrendingUp,
  Heart,
  Shield,
  Zap,
  Target,
  Award
} from 'lucide-react'
import { 
  fetchAnalytics, 
  fetchCriticalFindings, 
  fetchQAAlerts, 
  markCommunicated, 
  dismissAlert,
  getTimeAgo,
  type CriticalFinding,
  type QAAlert,
  type Analytics
} from '../services/analyticsService'

// Animated counter
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = value / 50
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else { setDisplay(Math.floor(start)) }
    }, 20)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}{suffix}</span>
}

// Progress ring
function ProgressRing({ progress, size = 80, color = '#8b5cf6' }: { progress: number; size?: number; color?: string }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
    </svg>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // State for API data
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [criticalFindings, setCriticalFindings] = useState<CriticalFinding[]>([])
  const [qaAlerts, setQAAlerts] = useState<QAAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data from API
  const loadData = async () => {
    try {
      const [analyticsData, findingsData, alertsData] = await Promise.all([
        fetchAnalytics(),
        fetchCriticalFindings(),
        fetchQAAlerts()
      ])
      setAnalytics(analyticsData)
      setCriticalFindings(findingsData)
      setQAAlerts(alertsData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Get user's display name
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Doctor'
  const firstName = displayName.split(' ')[0]

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const handleLogCommunication = async (id: number) => {
    await markCommunicated(id)
    setCriticalFindings(prev => prev.filter(f => f.id !== id))
  }

  const handleDismissAlert = async (id: number) => {
    await dismissAlert(id)
    setQAAlerts(prev => prev.filter(a => a.id !== id))
  }
  
  // Derived stats from analytics (with loading state)
  const stats = {
    pendingFollowups: analytics?.pending_followups || 0,
    overdueFollowups: analytics?.overdue_followups || 0,
    completedToday: Math.round((analytics?.completed_followups || 0) / 30),
    criticalPending: criticalFindings.length,
    complianceRate: analytics?.compliance_rate || 0,
    studiesThisWeek: analytics?.studies_this_week || 0,
    avgReadTime: analytics?.avg_read_time || 0,
    impactScore: analytics?.impact_score || 0,
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Personalized Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {getGreeting()}, Dr. {firstName}
            </h1>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — Here's your clinical overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Your Impact Score</p>
              <p className="text-2xl font-bold text-violet-600"><AnimatedNumber value={stats.impactScore} /></p>
            </div>
            <div className="p-3 bg-violet-100 rounded-xl">
              <Award size={24} className="text-violet-600" />
            </div>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {(stats.criticalPending > 0 || stats.overdueFollowups > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {stats.criticalPending > 0 && (
              <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-4 text-white shadow-lg shadow-red-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{stats.criticalPending} Critical Results Need Communication</p>
                      <p className="text-red-100 text-sm">Document verbal notification for legal protection</p>
                    </div>
                  </div>
                  <button onClick={() => document.getElementById('critical-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2">
                    Communicate Now <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            {stats.overdueFollowups > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{stats.overdueFollowups} Overdue Follow-ups</p>
                      <p className="text-amber-100 text-sm">Patients may need outreach</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/reading')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2">
                    Review <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Left Column - Critical Communications */}
          <div className="space-y-6">
            {/* Critical Results Communication */}
            <div id="critical-section" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Phone size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Critical Results</h3>
                    <p className="text-xs text-slate-500">Pending communication</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {criticalFindings.length} pending
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {criticalFindings.map(finding => (
                  <div key={finding.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            finding.severity === 'stat' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {finding.severity.toUpperCase()}
                          </span>
                          <span className="font-medium text-slate-900">{finding.patient}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{finding.finding}</p>
                        <p className="text-xs text-slate-400 mt-1">{finding.study} • {getTimeAgo(finding.timestamp)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => handleLogCommunication(finding.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Log Communication
                      </button>
                      <button 
                        onClick={() => navigate('/reading')}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        View Study
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Shield size={12} />
                  Communications are timestamped and stored for legal documentation
                </p>
              </div>
            </div>

            {/* Report QA Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileCheck size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Report QA Alerts</h3>
                  <p className="text-xs text-slate-500">Potential issues detected</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {qaAlerts.map(alert => (
                  <div key={alert.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700">{alert.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{alert.study}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 ml-7">
                      <button onClick={() => navigate('/reading')} className="text-xs text-violet-600 font-medium hover:underline">Review Report</button>
                      <button onClick={() => handleDismissAlert(alert.id)} className="text-xs text-slate-400 hover:text-slate-600">Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column - Stats & Follow-ups */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <Clock size={18} className="text-slate-400" />
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={stats.pendingFollowups} /></p>
                <p className="text-sm text-slate-500">Pending Follow-ups</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle size={18} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={stats.completedToday} /></p>
                <p className="text-sm text-slate-500">Completed Today</p>
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Follow-up Compliance</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ProgressRing progress={stats.complianceRate} size={100} color="#22c55e" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-slate-900">{stats.complianceRate}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Your rate</span>
                      <span className="font-medium text-green-600">{stats.complianceRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Department avg</span>
                      <span className="text-slate-500">78%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Target</span>
                      <span className="text-slate-500">95%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* This Week's Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">This Week</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={stats.studiesThisWeek} /></p>
                  <p className="text-xs text-slate-500">Studies Read</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={stats.avgReadTime} suffix=" min" /></p>
                  <p className="text-xs text-slate-500">Avg Read Time</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Productivity vs. last week</span>
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> +8%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Impact & Activity */}
          <div className="space-y-6">
            {/* Your Impact */}
            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Heart size={18} />
                <h3 className="font-semibold">Your Clinical Impact</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-violet-100">Critical findings this month</span>
                  <span className="font-bold">34</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-violet-100">Early cancer detections</span>
                  <span className="font-bold">7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-violet-100">Lives potentially impacted</span>
                  <span className="font-bold">12</span>
                </div>
                <div className="pt-3 border-t border-white/20">
                  <p className="text-sm text-violet-100">
                    Your recommendations have led to 7 early-stage cancer diagnoses this month. Keep up the excellent work.
                  </p>
                </div>
              </div>
            </div>

            {/* Outcome Feedback */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Outcome Feedback</h3>
                  <p className="text-xs text-slate-500">Learn from your recommendations</p>
                </div>
              </div>
              <div className="p-6 text-center text-slate-500">
                <p className="text-sm">Outcome data will appear as cases are resolved.</p>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => navigate('/metrics')} className="text-sm text-violet-600 font-medium hover:underline">
                  View All Outcomes
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/reading')} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Zap size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Reading Room</p>
                    <p className="text-xs text-slate-500">Continue reading studies</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 ml-auto" />
                </button>
                <button onClick={() => navigate('/reference')} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Reference</p>
                    <p className="text-xs text-slate-500">Anatomy, protocols, measurements</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
