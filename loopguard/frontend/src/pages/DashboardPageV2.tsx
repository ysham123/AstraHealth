/**
 * Enhanced Dashboard
 * 
 * Features:
 * - Animated stats
 * - Gamification (streaks, levels)
 * - Body map visualization
 * - Actionable insights
 * - Activity feed
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Trophy,
  Flame,
  Target,
  ChevronRight,
  Activity
} from 'lucide-react'
import BodyMap from '../components/BodyMap'

// Animated number component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = value / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{display}</span>
}

// Progress ring component
function ProgressRing({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
    streak: 0,
    level: 1,
    xp: 0,
  })

  useEffect(() => {
    // Animate stats loading
    setTimeout(() => {
      setStats({
        total: 47,
        pending: 12,
        completed: 32,
        overdue: 3,
        completionRate: 78,
        streak: 12,
        level: 8,
        xp: 2450,
      })
    }, 300)
  }, [])

  const insights = [
    { id: 1, type: 'warning', text: '3 follow-ups overdue - patients may be at risk', action: 'Review now' },
    { id: 2, type: 'success', text: 'Completion rate up 12% this week', action: null },
    { id: 3, type: 'info', text: 'Smith, J nodule grew 20% - consider earlier follow-up', action: 'View' },
  ]

  const activities = [
    { id: 1, text: 'CT Chest completed for Davis, A', time: '5 min ago', type: 'complete' },
    { id: 2, text: 'New follow-up created: MRI Brain - Wilson, T', time: '12 min ago', type: 'new' },
    { id: 3, text: 'STAT study added: CT Chest - Garcia, R', time: '25 min ago', type: 'urgent' },
    { id: 4, text: 'Follow-up scheduled: US Thyroid - Lee, M', time: '1 hr ago', type: 'scheduled' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Gamification */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500">Here's your follow-up overview</p>
          </div>
          
          {/* Gamification Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white shadow-lg shadow-orange-500/25">
              <Flame size={20} />
              <span className="font-bold">{stats.streak}</span>
              <span className="text-orange-100 text-sm">day streak</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full text-white shadow-lg shadow-violet-500/25">
              <Trophy size={20} />
              <span className="font-bold">Level {stats.level}</span>
              <span className="text-violet-100 text-sm">• {stats.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Target size={24} className="text-blue-600" />
              </div>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              <AnimatedNumber value={stats.total} />
            </p>
            <p className="text-slate-500 text-sm mt-1">Total Follow-ups</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              <AnimatedNumber value={stats.pending} />
            </p>
            <p className="text-slate-500 text-sm mt-1">Pending</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              <AnimatedNumber value={stats.completed} />
            </p>
            <p className="text-slate-500 text-sm mt-1">Completed</p>
          </div>

          <button 
            onClick={() => navigate('/reading')}
            className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all text-white text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-bold">
              <AnimatedNumber value={stats.overdue} />
            </p>
            <p className="text-red-100 text-sm mt-1">Overdue - Review now</p>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Completion Progress + Insights */}
          <div className="space-y-6">
            {/* Progress Ring */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Completion Rate</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ProgressRing progress={stats.completionRate} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{stats.completionRate}%</p>
                      <p className="text-xs text-slate-500">This month</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-slate-600">On-time: 28</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-600">Late: 4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-600">Overdue: 3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-900">Insights</h3>
              </div>
              <div className="space-y-3">
                {insights.map(insight => (
                  <div 
                    key={insight.id}
                    className={`p-3 rounded-xl flex items-start gap-3 ${
                      insight.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                      insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className={`p-1 rounded-full ${
                      insight.type === 'warning' ? 'bg-amber-200' :
                      insight.type === 'success' ? 'bg-green-200' : 'bg-blue-200'
                    }`}>
                      {insight.type === 'warning' ? <AlertTriangle size={14} className="text-amber-700" /> :
                       insight.type === 'success' ? <CheckCircle size={14} className="text-green-700" /> :
                       <Zap size={14} className="text-blue-700" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{insight.text}</p>
                      {insight.action && (
                        <button className="text-xs font-medium text-blue-600 mt-1 hover:underline">
                          {insight.action} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body Map */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Findings by Region</h3>
            <BodyMap />
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-slate-400" />
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'complete' ? 'bg-green-500' :
                    activity.type === 'urgent' ? 'bg-red-500' :
                    activity.type === 'new' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{activity.text}</p>
                    <p className="text-xs text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              View all activity
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
