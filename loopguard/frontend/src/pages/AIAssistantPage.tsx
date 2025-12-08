/**
 * AI Assistant - Multi-Agent Radiology Support
 * 
 * Powered by LLM-based agents:
 * - Report Analyzer: Extracts follow-up recommendations
 * - History Summarizer: Summarizes patient imaging history
 * - Differential Generator: Suggests differential diagnoses
 * - Protocol Advisor: Recommends imaging protocols
 * - Quality Checker: Pre-sign quality assurance
 */

import { useState } from 'react'
import { api } from '../api/client'
import {
  Brain, FileText, History, Stethoscope,
  Zap, Loader2, AlertTriangle, CheckCircle, Copy, Sparkles, Target, Shield,
} from 'lucide-react'

interface ExtractedRec {
  modality: string
  body_region: string
  interval_months: number
  finding: string
  urgency: string
  guideline: string | null
  confidence: number
}

interface HistorySummary {
  summary: string
  key_findings: string[]
  pending_followups: string[]
  trend: string
  attention_items: string[]
}

const AGENTS = [
  { id: 'report', name: 'Report Analyzer', icon: FileText, desc: 'Extract follow-ups from report' },
  { id: 'history', name: 'History Summary', icon: History, desc: 'Summarize patient history' },
  { id: 'differential', name: 'Differential DDx', icon: Stethoscope, desc: 'Generate differentials' },
  { id: 'protocol', name: 'Protocol Advisor', icon: Target, desc: 'Recommend protocols' },
  { id: 'quality', name: 'Quality Check', icon: Shield, desc: 'Pre-sign QA check' },
]

export default function AIAssistantPage() {
  const [activeAgent, setActiveAgent] = useState('report')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<ExtractedRec[]>([])
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null)
  const [differentials, setDifferentials] = useState<string[]>([])
  const [protocols, setProtocols] = useState<string[]>([])
  const [qualityIssues, setQualityIssues] = useState<{ type: string; message: string; severity: string }[]>([])
  const [copied, setCopied] = useState(false)

  const clearResults = () => {
    setRecommendations([]); setHistorySummary(null); setDifferentials([]); setProtocols([]); setQualityIssues([]); setError(null)
  }

  const handleAnalyze = async () => {
    if (!input.trim()) return
    setLoading(true); setError(null); clearResults()

    try {
      if (activeAgent === 'report') {
        const res = await api.post<{ recommendations: ExtractedRec[] }>('/ai/analyze-report', { impression_text: input })
        setRecommendations(res.recommendations)
      } else if (activeAgent === 'history') {
        const lines = input.split('\n').filter(l => l.trim())
        const priorStudies = lines.map(line => ({ date: line.split(':')[0]?.trim() || 'Unknown', modality: 'CT', body_region: 'Unknown', impression: line.split(':')[1]?.trim() || line }))
        const res = await api.post<HistorySummary>('/ai/summarize-history', { patient_name: 'Patient', prior_studies: priorStudies })
        setHistorySummary(res)
      } else if (activeAgent === 'differential') {
        setDifferentials(generateDifferentials(input))
      } else if (activeAgent === 'protocol') {
        setProtocols(recommendProtocols(input))
      } else if (activeAgent === 'quality') {
        setQualityIssues(checkQuality(input))
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed')
      if (activeAgent === 'differential') setDifferentials(generateDifferentials(input))
      if (activeAgent === 'protocol') setProtocols(recommendProtocols(input))
      if (activeAgent === 'quality') setQualityIssues(checkQuality(input))
    } finally {
      setLoading(false)
    }
  }

  const agent = AGENTS.find(a => a.id === activeAgent)!

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white"><Brain size={28} /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1><p className="text-slate-500">Multi-agent radiology support</p></div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => { setActiveAgent(a.id); clearResults(); setInput('') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${activeAgent === a.id ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
              <a.icon size={18} />{a.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <agent.icon size={20} className="text-violet-500" />
              <h2 className="font-semibold text-slate-900">{agent.name}</h2>
              <span className="ml-auto px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full flex items-center gap-1"><Sparkles size={12} /> AI</span>
            </div>
            <p className="text-sm text-slate-500 mb-4">{agent.desc}</p>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={getPlaceholder(activeAgent)} rows={14}
              className="w-full border border-slate-200 rounded-lg p-4 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            <div className="flex gap-3 mt-4">
              <button onClick={handleAnalyze} disabled={loading || !input.trim()}
                className="flex-1 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Zap size={18} /> Analyze</>}
              </button>
              <button onClick={() => { setInput(''); clearResults() }} className="px-4 py-3 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Clear</button>
            </div>
            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Results</h2>
              {(recommendations.length > 0 || historySummary || differentials.length > 0 || protocols.length > 0) && (
                <button onClick={() => { navigator.clipboard.writeText(formatResults()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="px-3 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 flex items-center gap-1"><Copy size={12} /> {copied ? 'Copied!' : 'Copy'}</button>
              )}
            </div>

            {activeAgent === 'report' && recommendations.length > 0 && (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-violet-900">{rec.modality} {rec.body_region}</span>
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${rec.urgency === 'stat' ? 'bg-red-100 text-red-700' : rec.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{rec.urgency}</span>
                    </div>
                    <p className="text-sm text-slate-700">{rec.finding}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>Follow-up: <strong>{rec.interval_months}mo</strong></span>
                      {rec.guideline && <span>{rec.guideline}</span>}
                      <span>{Math.round(rec.confidence * 100)}% conf</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeAgent === 'history' && historySummary && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-900 mb-1">Summary</p>
                  <p className="text-sm text-blue-800">{historySummary.summary}</p>
                </div>
                {historySummary.key_findings.length > 0 && <div><p className="font-medium text-slate-700 mb-2">Key Findings</p>{historySummary.key_findings.map((f, i) => <p key={i} className="text-sm text-slate-600 flex items-start gap-2"><CheckCircle size={14} className="text-green-500 mt-0.5" /> {f}</p>)}</div>}
                {historySummary.attention_items.length > 0 && <div><p className="font-medium text-slate-700 mb-2">Attention</p>{historySummary.attention_items.map((f, i) => <p key={i} className="text-sm text-amber-700 flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5" /> {f}</p>)}</div>}
              </div>
            )}

            {activeAgent === 'differential' && differentials.length > 0 && (
              <div className="space-y-2">{differentials.map((d, i) => <div key={i} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3"><span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span><span className="text-sm text-emerald-900">{d}</span></div>)}</div>
            )}

            {activeAgent === 'protocol' && protocols.length > 0 && (
              <div className="space-y-2">{protocols.map((p, i) => <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">{p}</div>)}</div>
            )}

            {activeAgent === 'quality' && qualityIssues.length > 0 && (
              <div className="space-y-2">
                {qualityIssues.every(q => q.severity === 'pass') ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2"><CheckCircle size={20} /> Report passes quality checks</div>
                ) : qualityIssues.filter(q => q.severity !== 'pass').map((q, i) => (
                  <div key={i} className={`p-3 rounded-lg flex items-start gap-2 ${q.severity === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    <AlertTriangle size={16} className="mt-0.5" /><div><p className="font-medium text-sm">{q.type}</p><p className="text-sm">{q.message}</p></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && recommendations.length === 0 && !historySummary && differentials.length === 0 && protocols.length === 0 && qualityIssues.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Brain size={48} className="mb-3" /><p>Enter text and click Analyze</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  function formatResults() {
    if (activeAgent === 'report') return recommendations.map(r => `${r.modality} ${r.body_region} in ${r.interval_months}mo - ${r.finding}`).join('\n')
    if (activeAgent === 'history' && historySummary) return historySummary.summary
    if (activeAgent === 'differential') return differentials.join('\n')
    if (activeAgent === 'protocol') return protocols.join('\n')
    return ''
  }
}

function getPlaceholder(agent: string): string {
  const placeholders: Record<string, string> = {
    report: 'Paste report impression...\n\nExample:\n8mm pulmonary nodule in RLL. Recommend CT in 3 months per Fleischner.',
    history: 'Enter prior studies (one per line):\n\n2024-01: 8mm RLL nodule\n2023-07: 6mm RLL nodule\n2023-01: Clear lungs',
    differential: 'Describe findings:\n\nExample:\n45F with 2cm enhancing right renal mass, no fat',
    protocol: 'Describe scenario:\n\nExample:\n55M with rising PSA, prior negative biopsy',
    quality: 'Paste draft report for QA:\n\nIMPRESSION:\n1. 8mm nodule in right lower lobe.',
  }
  return placeholders[agent] || ''
}

function generateDifferentials(findings: string): string[] {
  const l = findings.toLowerCase()
  if (l.includes('kidney') || l.includes('renal')) return ['Renal cell carcinoma', 'Oncocytoma', 'Angiomyolipoma (if fat present)', 'Metastasis', 'Urothelial carcinoma']
  if (l.includes('lung') || l.includes('nodule')) return ['Primary lung cancer', 'Metastasis', 'Granuloma', 'Hamartoma', 'Intrapulmonary lymph node']
  if (l.includes('liver')) return ['HCC (if cirrhosis)', 'Metastasis', 'Hemangioma', 'FNH', 'Adenoma']
  if (l.includes('brain')) return ['High-grade glioma', 'Metastasis', 'Lymphoma', 'Meningioma', 'Abscess']
  if (l.includes('thyroid')) return ['Papillary thyroid carcinoma', 'Follicular neoplasm', 'Benign adenomatoid nodule', 'Colloid cyst', 'Thyroiditis']
  return ['Provide more specific findings including location and characteristics']
}

function recommendProtocols(scenario: string): string[] {
  const l = scenario.toLowerCase()
  if (l.includes('prostate') || l.includes('psa')) return ['MRI Prostate multiparametric (T2, DWI, DCE)', 'PI-RADS v2.1 reporting', 'Consider PSMA PET if MRI equivocal']
  if (l.includes('liver') || l.includes('hcc')) return ['MRI with Eovist/Primovist', 'Use LI-RADS categorization', 'Multiphase CT if MRI not available']
  if (l.includes('pancrea')) return ['CT Pancreas Protocol (dual phase)', 'MRCP if cystic/ductal', 'EUS for small lesions']
  if (l.includes('pe') || l.includes('pulmonary embolism')) return ['CTA Chest PE Protocol', 'Ensure adequate PA opacification', 'V/Q if contrast contraindicated']
  return ['Provide clinical indication and body region']
}

function checkQuality(report: string): { type: string; message: string; severity: string }[] {
  const issues: { type: string; message: string; severity: string }[] = []
  const l = report.toLowerCase()
  if (!l.includes('compar') && !l.includes('prior')) issues.push({ type: 'No Comparison', message: 'Missing comparison to prior studies', severity: 'warning' })
  if ((l.includes('nodule') || l.includes('mass')) && !l.match(/\d+\s*(mm|cm)/)) issues.push({ type: 'No Measurement', message: 'Lesion without size', severity: 'error' })
  if ((l.includes('kidney') || l.includes('lung')) && !l.includes('right') && !l.includes('left') && !l.includes('bilateral')) issues.push({ type: 'No Laterality', message: 'Paired organ without side', severity: 'error' })
  if ((l.includes('nodule') || l.includes('mass')) && !l.includes('recommend') && !l.includes('follow')) issues.push({ type: 'No Follow-up', message: 'Finding without recommendation', severity: 'warning' })
  return issues.length ? issues : [{ type: 'Passed', message: 'No issues detected', severity: 'pass' }]
}
