/**
 * Reading Room - Production Radiologist Workstation
 * All data fetched from API - no hardcoded data
 */

import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { 
  FileText, Calendar, ChevronRight, Search, Check, AlertTriangle, 
  Clock, BookOpen, Copy, Zap, History, Plus, Loader2, RefreshCw
} from 'lucide-react'

interface Study {
  id: string
  patient_name: string
  patient_mrn: string
  patient_age: string
  patient_sex: string
  study_type: string
  modality: string
  study_date: string
  ordering_physician: string
  clinical_history: string
  priority: 'routine' | 'urgent' | 'stat'
  prior_studies: number
  body_part: string
}

interface Guideline { name: string; category: string; recommendation: string; followup: string }

// Clinical guidelines are reference data, not PHI
const GUIDELINES: Record<string, Guideline[]> = {
  'lung': [
    { name: 'Fleischner 2017', category: '<6mm solid, low risk', recommendation: 'No routine follow-up', followup: 'None' },
    { name: 'Fleischner 2017', category: '<6mm solid, high risk', recommendation: 'Optional CT at 12 months', followup: '12 mo' },
    { name: 'Fleischner 2017', category: '6-8mm solid', recommendation: 'CT at 6-12 months', followup: '6-12 mo' },
    { name: 'Fleischner 2017', category: '>8mm solid', recommendation: 'CT at 3 months, PET/CT, or biopsy', followup: '3 mo' },
    { name: 'Lung-RADS', category: '2 - Benign', recommendation: 'Continue annual screening', followup: '12 mo' },
    { name: 'Lung-RADS', category: '3 - Probably benign', recommendation: '6-month LDCT', followup: '6 mo' },
    { name: 'Lung-RADS', category: '4A - Suspicious', recommendation: '3-month LDCT or PET/CT', followup: '3 mo' },
    { name: 'Lung-RADS', category: '4B/X - Very suspicious', recommendation: 'Tissue sampling', followup: 'Immediate' },
  ],
  'liver': [
    { name: 'LI-RADS v2018', category: 'LR-1 Definitely benign', recommendation: 'No additional workup', followup: 'None' },
    { name: 'LI-RADS v2018', category: 'LR-2 Probably benign', recommendation: 'Continue surveillance', followup: '6 mo' },
    { name: 'LI-RADS v2018', category: 'LR-3 Intermediate', recommendation: 'Repeat imaging 3-6 months', followup: '3-6 mo' },
    { name: 'LI-RADS v2018', category: 'LR-4 Probably HCC', recommendation: 'Multidisciplinary discussion', followup: 'MDT' },
    { name: 'LI-RADS v2018', category: 'LR-5 Definitely HCC', recommendation: 'Treat without biopsy', followup: 'Treatment' },
  ],
  'thyroid': [
    { name: 'ACR TI-RADS', category: 'TR1-2', recommendation: 'No FNA needed', followup: 'None' },
    { name: 'ACR TI-RADS', category: 'TR3 Mildly suspicious', recommendation: 'FNA if >=2.5cm', followup: '1-2 yr' },
    { name: 'ACR TI-RADS', category: 'TR4 Moderately suspicious', recommendation: 'FNA if >=1.5cm', followup: '1-2 yr' },
    { name: 'ACR TI-RADS', category: 'TR5 Highly suspicious', recommendation: 'FNA if >=1cm', followup: '1 yr' },
  ],
  'renal': [
    { name: 'Bosniak 2019', category: 'I-II Simple/minimally complex', recommendation: 'Benign, no follow-up', followup: 'None' },
    { name: 'Bosniak 2019', category: 'IIF Mildly complex', recommendation: 'Follow-up imaging', followup: '6-12 mo' },
    { name: 'Bosniak 2019', category: 'III Indeterminate', recommendation: 'Surgery or surveillance', followup: 'Urology' },
    { name: 'Bosniak 2019', category: 'IV Malignant', recommendation: 'Surgical excision', followup: 'Surgery' },
  ],
}

const TEMPLATES: Record<string, string[]> = {
  'CT Chest': [
    'LUNGS: Clear. No nodules, masses, or consolidation.',
    'PLEURA: No effusion or pneumothorax.',
    'MEDIASTINUM: No lymphadenopathy. Heart size normal.',
    'BONES: No suspicious osseous lesions.',
  ],
  'CT Abdomen': [
    'LIVER: Normal size and attenuation. No focal lesion.',
    'GALLBLADDER: No cholelithiasis. No biliary dilation.',
    'PANCREAS: Normal. No ductal dilation.',
    'KIDNEYS: Normal. No hydronephrosis or stones.',
  ],
  'MRI Brain': [
    'No acute infarction on DWI.',
    'PARENCHYMA: Normal signal. No mass or enhancement.',
    'VENTRICLES: Normal size and configuration.',
  ],
}

export default function ReadingRoomPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Study | null>(null)
  const [report, setReport] = useState('')
  const [tab, setTab] = useState<'guidelines' | 'templates'>('guidelines')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [followup, setFollowup] = useState({ modality: 'CT', region: 'Chest', interval: 6, finding: '' })
  const [showFU, setShowFU] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch studies from API
  const fetchStudies = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ studies: Study[] }>('/worklist/studies')
      setStudies(data.studies || [])
      if (data.studies?.length > 0 && !selected) {
        setSelected(data.studies[0])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load worklist')
      setStudies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStudies() }, [])

  const filtered = studies
    .filter(s => filter === 'all' || s.modality === filter)
    .filter(s => s.patient_name.toLowerCase().includes(search.toLowerCase()) || s.study_type.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const p = { stat: 0, urgent: 1, routine: 2 }
      return p[a.priority] - p[b.priority]
    })

  const getGuidelines = () => {
    if (!selected) return []
    const bp = selected.body_part.toLowerCase()
    if (bp.includes('chest')) return GUIDELINES['lung'] || []
    if (bp.includes('abdomen')) return [...(GUIDELINES['liver'] || []), ...(GUIDELINES['renal'] || [])]
    if (bp.includes('neck')) return GUIDELINES['thyroid'] || []
    return []
  }

  const getTemplates = () => {
    if (!selected) return []
    if (selected.study_type.includes('CT Chest')) return TEMPLATES['CT Chest'] || []
    if (selected.study_type.includes('CT Abdomen')) return TEMPLATES['CT Abdomen'] || []
    if (selected.study_type.includes('MRI Brain')) return TEMPLATES['MRI Brain'] || []
    return []
  }

  const signAndNext = async () => {
    if (!selected) return
    setSaving(true)
    try {
      // Save the report
      await api.post('/worklist/sign', {
        study_id: selected.id,
        report_text: report,
        findings: report,
        impression: ''
      })
      
      // Remove signed study from list and move to next
      setStudies(prev => prev.filter(s => s.id !== selected.id))
      const idx = filtered.findIndex(s => s.id === selected.id)
      const remaining = filtered.filter(s => s.id !== selected.id)
      const next = remaining[idx] || remaining[idx - 1] || null
      setReport('')
      setShowFU(false)
      setSelected(next)
    } catch (err) {
      console.error('Failed to sign report:', err)
    } finally {
      setSaving(false)
    }
  }

  const submitFollowup = async () => {
    if (!followup.finding.trim() || !selected) return
    setSaving(true)
    try {
      await api.post('/followups', {
        study_id: selected.id,
        recommended_modality: followup.modality,
        body_region: followup.region,
        reason: followup.finding,
        interval_months: followup.interval,
        priority: 'routine',
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); setFollowup({ modality: 'CT', region: 'Chest', interval: 6, finding: '' }); setShowFU(false) }, 1500)
    } catch (err) {
      console.error('Failed to save followup:', err)
    } finally {
      setSaving(false)
    }
  }

  const copy = () => { navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const insert = (t: string) => setReport(p => p + (p ? '\n' : '') + t)
  const pStyle = (p: string) => p === 'stat' ? 'bg-red-100 text-red-700' : p === 'urgent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'

  if (loading) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto animate-spin text-violet-600 mb-4" />
          <p className="text-slate-600">Loading worklist...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Worklist</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={fetchStudies} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Check size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Worklist Empty</h2>
          <p className="text-slate-600 mt-2">No pending studies in your queue.</p>
          <button onClick={fetchStudies} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] flex bg-slate-100">
      {/* Worklist */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Worklist</h2>
            <button onClick={fetchStudies} className="p-1 hover:bg-slate-100 rounded"><RefreshCw size={16} /></button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg" />
          </div>
          <div className="flex gap-1">
            {['all', 'CT', 'MRI', 'US', 'XR'].map(m => (
              <button key={m} onClick={() => setFilter(m)} className={`px-2 py-1 text-xs rounded ${filter === m ? 'bg-violet-100 text-violet-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}>{m === 'all' ? 'All' : m}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map(s => (
            <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left p-3 border-b transition ${selected?.id === s.id ? 'bg-violet-50 border-l-2 border-l-violet-600' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.patient_name}</span>
                {s.priority !== 'routine' && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pStyle(s.priority)}`}>{s.priority.toUpperCase()}</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{s.study_type}</p>
              <div className="flex gap-2 mt-1 text-xs text-slate-400">
                <span>{s.patient_age}{s.patient_sex}</span>
                {s.prior_studies > 0 && <span className="text-blue-600"><History size={10} className="inline" /> {s.prior_studies}</span>}
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t bg-slate-50 text-xs text-slate-600">{filtered.length} studies</div>
      </div>

      {/* Main */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b px-6 py-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold">{selected.patient_name}</h1>
                  <span className="text-slate-500 text-sm">{selected.patient_age}{selected.patient_sex}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 text-sm">{selected.patient_mrn}</span>
                  {selected.priority !== 'routine' && <span className={`text-xs px-2 py-0.5 rounded font-medium ${pStyle(selected.priority)}`}>{selected.priority.toUpperCase()}</span>}
                </div>
                <p className="text-slate-600 text-sm mt-1">{selected.study_type}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-600">{selected.ordering_physician}</p>
                <p className="text-slate-400">{selected.study_date}</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm"><span className="font-medium text-amber-800">History:</span> <span className="text-amber-900">{selected.clinical_history}</span></p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="flex gap-6">
              <div className="flex-1 min-w-0 space-y-4">
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><FileText size={18} className="text-violet-500" /><span className="font-medium">Report</span></div>
                    <button onClick={copy} className="px-3 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 flex items-center gap-1"><Copy size={12} /> {copied ? 'Copied!' : 'Copy'}</button>
                  </div>
                  <textarea value={report} onChange={e => setReport(e.target.value)} placeholder="Type or insert templates..." rows={10} className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Calendar size={18} className="text-violet-500" /><span className="font-medium">Follow-up</span></div>
                    {!showFU && <button onClick={() => setShowFU(true)} className="text-sm text-violet-600 font-medium flex items-center gap-1"><Plus size={14} /> Add</button>}
                  </div>
                  {showFU && (saved ? <div className="py-4 text-center text-green-600 font-medium flex items-center justify-center gap-2"><Check size={18} /> Saved!</div> : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={followup.modality} onChange={e => setFollowup(p => ({ ...p, modality: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">{['CT', 'MRI', 'US', 'PET', 'XR'].map(m => <option key={m}>{m}</option>)}</select>
                        <select value={followup.region} onChange={e => setFollowup(p => ({ ...p, region: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">{['Chest', 'Abdomen', 'Pelvis', 'Brain', 'Neck'].map(r => <option key={r}>{r}</option>)}</select>
                      </div>
                      <div className="flex gap-2">{[3, 6, 12, 24].map(i => <button key={i} onClick={() => setFollowup(p => ({ ...p, interval: i }))} className={`flex-1 py-2 text-sm rounded-lg border ${followup.interval === i ? 'border-violet-500 bg-violet-50 text-violet-700 font-medium' : 'hover:bg-slate-50'}`}>{i}mo</button>)}</div>
                      <textarea value={followup.finding} onChange={e => setFollowup(p => ({ ...p, finding: e.target.value }))} placeholder="Finding requiring follow-up..." rows={2} className="w-full border rounded-lg p-3 text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowFU(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                        <button onClick={submitFollowup} disabled={!followup.finding.trim() || saving} className="flex-1 py-2 bg-violet-600 text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-80 flex-shrink-0 space-y-4">
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="flex border-b">
                    {[{ id: 'guidelines', label: 'Guidelines', icon: BookOpen }, { id: 'templates', label: 'Templates', icon: Zap }].map(t => (
                      <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1 ${tab === t.id ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600' : 'text-slate-500 hover:bg-slate-50'}`}><t.icon size={14} /> {t.label}</button>
                    ))}
                  </div>
                  <div className="p-4 max-h-80 overflow-auto">
                    {tab === 'guidelines' && (getGuidelines().length > 0 ? getGuidelines().map((g, i) => (
                      <button key={i} onClick={() => insert(`Per ${g.name} (${g.category}): ${g.recommendation}. Follow-up: ${g.followup}.`)} className="w-full text-left p-3 bg-slate-50 rounded-lg border mb-2 hover:border-violet-300">
                        <div className="flex justify-between"><span className="text-xs font-medium text-violet-600">{g.name}</span><span className="text-xs text-slate-400">{g.followup}</span></div>
                        <p className="text-sm font-medium text-slate-800 mt-1">{g.category}</p>
                        <p className="text-xs text-slate-600 mt-1">{g.recommendation}</p>
                      </button>
                    )) : <p className="text-sm text-slate-500 text-center py-4">No guidelines for this study type</p>)}
                    {tab === 'templates' && (getTemplates().length > 0 ? getTemplates().map((t, i) => (
                      <button key={i} onClick={() => insert(t)} className="w-full text-left p-3 bg-slate-50 rounded-lg border mb-2 hover:border-violet-300 hover:bg-violet-50">
                        <p className="text-sm text-slate-700">{t}</p>
                        <p className="text-xs text-violet-600 mt-1"><Plus size={10} className="inline" /> Insert</p>
                      </button>
                    )) : <p className="text-sm text-slate-500 text-center py-4">No templates for this study type</p>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-t px-6 py-4 flex justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-500"><Clock size={14} /> {selected.study_date}</div>
            <button onClick={signAndNext} disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">{saving ? <><Loader2 size={16} className="animate-spin" /> Signing...</> : <>Sign and Next <ChevronRight size={16} /></>}</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Select a study from the worklist</p>
          </div>
        </div>
      )}
    </div>
  )
}
