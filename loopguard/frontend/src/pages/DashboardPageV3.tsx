/**
 * Professional Clinical Dashboard
 * 
 * Features:
 * - Clinical metrics and KPIs
 * - Risk calculator integration
 * - Guideline-based decision support
 * - Body map visualization
 * - Actionable alerts
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ChevronRight,
  Activity,
  BarChart2,
  Users,
  Calendar
} from 'lucide-react'
import BodyMap from '../components/BodyMap'
import RiskCalculator from '../components/RiskCalculator'
import ClinicalDecisionSupport from '../components/ClinicalDecisionSupport'

// Animated number component
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = value / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else { setDisplay(Math.floor(start)) }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <span>{display}</span>
}

// Progress ring
function ProgressRing({ progress, size = 100 }: { progress: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#grad)" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
      <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, overdue: 0, compliance: 0, avgDays: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'guidelines'>('overview')

  useEffect(() => {
    setTimeout(() => setStats({ total: 156, pending: 23, completed: 128, overdue: 5, compliance: 82, avgDays: 12 }), 300)
  }, [])

  const alerts = [
    { id: 1, severity: 'critical', text: '5 follow-ups are overdue and require immediate attention', action: 'Review' },
    { id: 2, severity: 'warning', text: 'Patient Smith, J - nodule growth exceeds expected rate', action: 'View' },
    { id: 3, severity: 'info', text: 'Monthly compliance report ready for review', action: 'Open' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clinical Dashboard</h1>
            <p className="text-slate-500 text-sm">Follow-up tracking and decision support</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Critical Alerts */}
        {stats.overdue > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-4 text-white shadow-lg shadow-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} />
                <div>
                  <p className="font-semibold">{stats.overdue} Critical Follow-ups Overdue</p>
                  <p className="text-red-100 text-sm">Patients may be at risk - immediate review recommended</p>
                </div>
              </div>
              <button onClick={() => navigate('/reading')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2 transition-colors">
                Review Now <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total Active', value: stats.total, icon: Users, color: 'bg-blue-500', trend: '+12%' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-green-500', trend: '+8%' },
            { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-500', critical: true },
            { label: 'Avg Days to Complete', value: stats.avgDays, icon: BarChart2, color: 'bg-indigo-500', suffix: 'd' },
          ].map((kpi, i) => (
            <div key={i} className={`bg-white rounded-xl p-5 border border-slate-200 shadow-sm ${kpi.critical ? 'ring-2 ring-red-200' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${kpi.color} bg-opacity-10`}>
                  <kpi.icon size={18} className={kpi.color.replace('bg-', 'text-')} />
                </div>
                {kpi.trend && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><TrendingUp size={12} />{kpi.trend}</span>}
              </div>
              <p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={kpi.value} />{kpi.suffix}</p>
              <p className="text-sm text-slate-500">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'risk', label: 'Risk Calculator' },
            { id: 'guidelines', label: 'Decision Support' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Compliance Ring */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Compliance Rate</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ProgressRing progress={stats.compliance} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{stats.compliance}%</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-slate-600">On-time: 108</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-slate-600">Late: 20</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-slate-600">Overdue: 5</span></div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Target: 95% | Department avg: 78%</p>
            </div>

            {/* Body Map */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Findings Distribution</h3>
              <BodyMap />
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-slate-400" />
                <h3 className="font-semibold text-slate-900">Alerts</h3>
              </div>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className="text-sm text-slate-700">{alert.text}</p>
                    <button className="text-xs font-medium text-indigo-600 mt-1 hover:underline">{alert.action} →</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <RiskCalculator />
        )}

        {activeTab === 'guidelines' && (
          <ClinicalDecisionSupport />
        )}
      </div>
    </div>
  )
}
