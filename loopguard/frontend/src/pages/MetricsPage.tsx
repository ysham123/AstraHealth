/**
 * Analytics Dashboard
 * 
 * Comprehensive analytics for radiologists:
 * - Personal productivity trends
 * - Clinical impact & outcomes
 * - Quality metrics
 * - Benchmarking
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  Heart,
  Brain,
  Activity,
  Download,
} from 'lucide-react'
import { fetchAnalytics, type Analytics } from '../services/analyticsService'

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

export default function MetricsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState('6months')
  const [activeTab, setActiveTab] = useState<'productivity' | 'outcomes' | 'quality'>('productivity')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Fetch analytics from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await fetchAnalytics()
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [timeRange])
  
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Doctor'
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  // Derived data from analytics (with null safety)
  const totalStudies = analytics?.total_studies || 0
  const totalCritical = analytics?.critical_findings_count || 0
  const avgReadTime = (analytics?.avg_read_time || 0).toFixed(1)
  const malignantFindings = analytics?.outcomes?.malignant || 0
  
  // Format weekly data for charts
  const PRODUCTIVITY_DATA = analytics?.weekly_data || []
  
  // Format outcomes for pie chart
  const OUTCOMES_DATA = [
    { category: 'Malignant', count: analytics?.outcomes?.malignant || 0, color: '#ef4444' },
    { category: 'Benign', count: analytics?.outcomes?.benign || 0, color: '#22c55e' },
    { category: 'Indeterminate', count: analytics?.outcomes?.indeterminate || 0, color: '#f59e0b' },
    { category: 'Lost to F/U', count: analytics?.outcomes?.lost_to_followup || 0, color: '#6b7280' },
  ].filter(o => o.count > 0)
  
  // Modality stats from analytics
  const MODALITY_STATS = analytics?.modality_stats || []
  
  // Accuracy trend
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
  const baseAccuracy = analytics?.compliance_rate || 85
  const ACCURACY_DATA = months.map((month) => ({
    month,
    accuracy: baseAccuracy,
    deptAvg: 78,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-slate-500">Performance insights for Dr. {displayName.split(' ')[0]}</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white">
              <option value="30days">Last 30 Days</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                <Download size={16} /> Export
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button 
                  onClick={() => {
                    const csvRows = [
                      ['Metric', 'Value'],
                      ['Total Studies', totalStudies],
                      ['Avg Read Time (min)', avgReadTime],
                      ['Critical Findings', totalCritical],
                      ['Malignant Findings', malignantFindings],
                      ['Compliance Rate', analytics?.compliance_rate || 0],
                      [],
                      ['Modality', 'Count', 'Avg Time'],
                      ...MODALITY_STATS.map(m => [m.modality, m.count, m.avg_time]),
                    ]
                    const csvContent = csvRows.map(row => row.join(',')).join('\n')
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                >
                  CSV
                </button>
                <button 
                  onClick={() => {
                    const printWindow = window.open('', '_blank')
                    if (!printWindow) return
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Analytics Report</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 40px; }
                            h1 { color: #1e293b; margin-bottom: 8px; }
                            h2 { color: #475569; font-size: 14px; margin-bottom: 24px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                            th { background: #f8fafc; font-weight: 600; }
                            .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
                            .value { font-weight: 600; color: #7c3aed; }
                          </style>
                        </head>
                        <body>
                          <h1>Analytics Report</h1>
                          <h2>Generated: ${new Date().toLocaleDateString()}</h2>
                          <div class="metric"><span>Total Studies</span><span class="value">${totalStudies}</span></div>
                          <div class="metric"><span>Avg Read Time</span><span class="value">${avgReadTime} min</span></div>
                          <div class="metric"><span>Critical Findings</span><span class="value">${totalCritical}</span></div>
                          <div class="metric"><span>Malignant Findings</span><span class="value">${malignantFindings}</span></div>
                          <table>
                            <thead><tr><th>Modality</th><th>Count</th><th>Avg Time</th></tr></thead>
                            <tbody>
                              ${MODALITY_STATS.map(m => `<tr><td>${m.modality}</td><td>${m.count}</td><td>${m.avg_time} min</td></tr>`).join('')}
                            </tbody>
                          </table>
                        </body>
                      </html>
                    `)
                    printWindow.document.close()
                    printWindow.print()
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <Activity size={18} className="text-violet-500" />
              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><TrendingUp size={12} /> +12%</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalStudies}</p>
            <p className="text-sm text-slate-500">Studies Read</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock size={18} className="text-blue-500" />
              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><TrendingDown size={12} /> -8%</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{avgReadTime} min</p>
            <p className="text-sm text-slate-500">Avg Read Time</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <AlertTriangle size={18} className="text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{totalCritical}</p>
            <p className="text-sm text-slate-500">Critical Findings</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Target size={18} className="text-green-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">94%</p>
            <p className="text-sm text-slate-500">Accuracy Rate</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl p-5 text-white">
            <Heart size={18} className="mb-2" />
            <p className="text-2xl font-bold">{malignantFindings}</p>
            <p className="text-sm text-violet-100">Early Cancers Found</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {[
            { id: 'productivity' as const, label: 'Productivity', icon: <Activity size={16} /> },
            { id: 'outcomes' as const, label: 'Outcomes', icon: <Target size={16} /> },
            { id: 'quality' as const, label: 'Quality', icon: <Award size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Productivity Tab */}
        {activeTab === 'productivity' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Studies Read Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={PRODUCTIVITY_DATA}>
                  <defs>
                    <linearGradient id="colorStudies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="studies" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorStudies)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Read Time Trend (minutes)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={PRODUCTIVITY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[4, 8]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
              <h3 className="font-semibold text-slate-900 mb-4">Performance by Modality</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                    <th className="pb-3 font-medium">Modality</th>
                    <th className="pb-3 font-medium">Studies</th>
                    <th className="pb-3 font-medium">Avg Time</th>
                    <th className="pb-3 font-medium">Accuracy</th>
                    <th className="pb-3 font-medium">vs. Dept Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODALITY_STATS.map((m, i) => (
                    <tr key={m.modality} className="hover:bg-slate-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="font-medium text-slate-900">{m.modality}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{m.count}</td>
                      <td className="py-3 text-slate-600">{m.avg_time} min</td>
                      <td className="py-3">
                        <span className="font-medium text-green-600">95%</span>
                      </td>
                      <td className="py-3">
                        <span className="text-green-600 text-sm font-medium">+{2 + i}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outcomes Tab */}
        {activeTab === 'outcomes' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Follow-up Outcomes</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={OUTCOMES_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count">
                    {OUTCOMES_DATA.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {OUTCOMES_DATA.map(o => (
                  <div key={o.category} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                    <span className="text-slate-600">{o.category}: {o.count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} />
                <h3 className="font-semibold">Clinical Impact</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold">{malignantFindings}</p>
                  <p className="text-green-100 text-sm">Malignancies Detected</p>
                </div>
                <div className="pt-3 border-t border-white/20">
                  <p className="text-sm text-green-100">
                    Your follow-up recommendations led to {malignantFindings} early-stage cancer diagnoses this period.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg px-3 py-2">
                  <Award size={14} />
                  <span>Top 10% in department</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Accuracy vs. Department</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ACCURACY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[80, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} name="You" />
                  <Line type="monotone" dataKey="deptAvg" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Dept" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-green-500" /><span className="text-slate-600">You</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-slate-400" /><span className="text-slate-600">Dept Avg</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Quality Scores</h3>
              <div className="space-y-4">
                {[
                  { label: 'Report Completeness', value: 96, color: 'bg-green-500' },
                  { label: 'Guideline Adherence', value: 92, color: 'bg-blue-500' },
                  { label: 'Recommendation Clarity', value: 88, color: 'bg-violet-500' },
                  { label: 'Communication Speed', value: 94, color: 'bg-amber-500' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{m.label}</span>
                      <span className="font-medium text-slate-900">{m.value}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${m.color} h-2 rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Peer Comparison</h3>
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white mb-3">
                  <span className="text-2xl font-bold">A+</span>
                </div>
                <p className="text-sm text-slate-600">Overall Performance Grade</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Percentile Rank</span>
                  <span className="font-medium text-green-600">Top 8%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Volume vs. Peers</span>
                  <span className="font-medium text-green-600">+18%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Accuracy vs. Peers</span>
                  <span className="font-medium text-green-600">+6%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Compliance Rate</span>
                  <span className="font-medium text-green-600">+12%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Growth Opportunities</h3>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Brain size={16} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">MRI Read Time</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        8.4 min avg vs. 7.2 min dept average
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Target size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Thyroid Follow-up</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        86% compliance - add TI-RADS language
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Award size={16} className="text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Lung Nodules</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        98% Fleischner compliance - excellent!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
