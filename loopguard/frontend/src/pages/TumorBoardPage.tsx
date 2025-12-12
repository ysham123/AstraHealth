/**
 * Tumor Board - Production MDT Case Management
 * All data fetched from API - no hardcoded patient data
 */

import { useState, useEffect } from 'react'
import { api } from '../api/client'
import {
  Users, FileText, Target,
  Calendar, CheckCircle, AlertTriangle, Edit3, Download, 
  Share2, Activity, ClipboardList, Loader2, RefreshCw
} from 'lucide-react'

interface Patient {
  id: string; name: string; age: number; sex: string; mrn: string
  diagnosis: string; primary_site: string; histology: string; referring_md: string
}

interface Measurement {
  id: string; lesion_id: string; location: string; date: string
  long_axis: number; short_axis: number; type: 'target' | 'non-target' | 'new'
}

interface TeamMember {
  id: string; name: string
  role: 'radiology' | 'oncology' | 'surgery' | 'pathology' | 'radiation'
  recommendation?: string
}

interface TumorCase {
  id: string; patient: Patient
  status: 'preparing' | 'scheduled' | 'completed'
  scheduled_date?: string
  stage?: { t: string; n: string; m: string; overall: string }
  measurements: Measurement[]
  team: TeamMember[]
  consensus?: string
  action_items: string[]
}

// TNM reference data (not PHI)
const TNM = {
  lung: { name: 'NSCLC', T: ['Tx','T0','Tis','T1a','T1b','T1c','T2a','T2b','T3','T4'], N: ['Nx','N0','N1','N2','N3'], M: ['M0','M1a','M1b','M1c'] },
  breast: { name: 'Breast', T: ['Tx','T0','Tis','T1','T2','T3','T4'], N: ['Nx','N0','N1','N2','N3'], M: ['M0','M1'] },
  colorectal: { name: 'Colorectal', T: ['Tx','T0','Tis','T1','T2','T3','T4a','T4b'], N: ['Nx','N0','N1','N2'], M: ['M0','M1a','M1b','M1c'] },
  liver: { name: 'HCC', T: ['Tx','T0','T1a','T1b','T2','T3','T4'], N: ['Nx','N0','N1'], M: ['M0','M1'] },
  prostate: { name: 'Prostate', T: ['Tx','T0','T1','T2a','T2b','T2c','T3a','T3b','T4'], N: ['Nx','N0','N1'], M: ['M0','M1a','M1b','M1c'] },
}

function calcRECIST(current: Measurement[], baseline: Measurement[]) {
  const cSum = current.filter(m => m.type === 'target').reduce((s, m) => s + m.long_axis, 0)
  const bSum = baseline.filter(m => m.type === 'target').reduce((s, m) => s + m.long_axis, 0)
  if (!bSum) return null
  const pct = Math.round(((cSum - bSum) / bSum) * 100)
  const response = pct <= -30 ? 'Partial Response (PR)' : pct >= 20 ? 'Progressive Disease (PD)' : cSum === 0 ? 'Complete Response (CR)' : 'Stable Disease (SD)'
  return { response, pct, cSum, bSum }
}

function calcStage(t: string, n: string, m: string) {
  if (m.startsWith('M1')) return 'IV'
  if (n === 'N3') return 'IIIC'
  if (n === 'N2') return 'IIIB'
  if (t === 'T4') return 'IIIA'
  if (t === 'T3' || n === 'N1') return 'II'
  return 'I'
}

export default function TumorBoardPage() {
  const [cases, setCases] = useState<TumorCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sel, setSel] = useState<TumorCase | null>(null)
  const [tab, setTab] = useState<'overview'|'staging'|'recist'|'team'|'summary'>('overview')
  const [cancer, setCancer] = useState<keyof typeof TNM>('lung')
  const [stg, setStg] = useState({ t: '', n: '', m: '' })
  const [consensus, setConsensus] = useState('')
  const [recs, setRecs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetchCases = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ cases: TumorCase[] }>('/tumor-board/cases')
      setCases(data.cases || [])
      if (data.cases?.length > 0 && !sel) {
        setSel(data.cases[0])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tumor board cases')
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCases() }, [])

  const select = (c: TumorCase) => {
    setSel(c)
    setStg({ t: c.stage?.t || '', n: c.stage?.n || '', m: c.stage?.m || '' })
    setConsensus(c.consensus || '')
    setRecs(Object.fromEntries(c.team.map(t => [t.id, t.recommendation || ''])))
  }

  const saveConsensus = async () => {
    if (!sel) return
    setSaving(true)
    try {
      await api.patch(`/tumor-board/cases/${sel.id}`, { consensus, status: 'completed' })
      setCases(prev => prev.map(c => c.id === sel.id ? { ...c, consensus, status: 'completed' as const } : c))
      setSel(prev => prev ? { ...prev, consensus, status: 'completed' } : null)
    } catch (err) {
      console.error('Failed to save consensus:', err)
    } finally {
      setSaving(false)
    }
  }

  const recist = sel ? (() => {
    const dates = [...new Set(sel.measurements.map(m => m.date))].sort()
    if (dates.length < 2) return null
    return calcRECIST(
      sel.measurements.filter(m => m.date === dates[dates.length - 1]),
      sel.measurements.filter(m => m.date === dates[0])
    )
  })() : null

  const roleColor = (r: string) => ({ radiology: 'bg-violet-100 text-violet-700', oncology: 'bg-blue-100 text-blue-700', surgery: 'bg-emerald-100 text-emerald-700', pathology: 'bg-amber-100 text-amber-700', radiation: 'bg-rose-100 text-rose-700' }[r] || 'bg-slate-100')

  const summary = () => {
    if (!sel) return ''
    const t = sel.measurements.filter(m => m.type === 'target')
    return `TUMOR BOARD SUMMARY\n\nPatient: ${sel.patient.name} (${sel.patient.age}${sel.patient.sex}, ${sel.patient.mrn})\nDiagnosis: ${sel.patient.diagnosis}\nSite: ${sel.patient.primary_site}\nHistology: ${sel.patient.histology}\n\nSTAGING: ${sel.stage?.t || '?'} ${sel.stage?.n || '?'} ${sel.stage?.m || '?'} - Stage ${sel.stage?.overall || '?'}\n\nTARGET LESIONS:\n${t.map(m => `- ${m.location}: ${m.long_axis}x${m.short_axis}mm`).join('\n')}\nSum LD: ${t.reduce((s, m) => s + m.long_axis, 0)}mm\n\nTEAM:\n${sel.team.map(tm => `- ${tm.name} (${tm.role}): ${recs[tm.id] || tm.recommendation || 'Pending'}`).join('\n')}\n\nCONSENSUS: ${consensus || 'Pending'}`
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto animate-spin text-rose-600 mb-4" />
          <p className="text-slate-600">Loading tumor board cases...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Cases</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={fetchCases} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">No Cases Scheduled</h2>
          <p className="text-slate-600 mt-2">No tumor board cases pending review.</p>
          <button onClick={fetchCases} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 to-rose-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl text-white"><Users size={28} /></div>
            <div><h1 className="text-2xl font-bold">Tumor Board</h1><p className="text-slate-500">Multidisciplinary Case Review</p></div>
          </div>
          <button onClick={fetchCases} className="px-4 py-2 bg-white border rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={18} />Refresh</button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b font-semibold">Cases ({cases.length})</div>
            {cases.map(c => (
              <button key={c.id} onClick={() => select(c)} className={`w-full p-4 text-left border-b hover:bg-slate-50 transition ${sel?.id === c.id ? 'bg-rose-50 border-l-2 border-rose-500' : ''}`}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{c.patient.name}</p>
                    <p className="text-sm text-slate-500">{c.patient.diagnosis}</p>
                    <p className="text-xs text-slate-400 mt-1">{c.patient.mrn}</p>
                  </div>
                  <span className={`h-fit px-2 py-1 text-xs rounded-full ${c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </div>
                {c.stage && <p className="text-xs mt-2 text-slate-500">Stage {c.stage.overall}</p>}
                {c.scheduled_date && <p className="text-xs text-rose-600 mt-1 flex items-center gap-1"><Calendar size={12} />{c.scheduled_date}</p>}
              </button>
            ))}
          </div>

          <div className="col-span-8">
            {sel ? (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-rose-50 to-pink-50 border-b">
                  <div className="flex justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{sel.patient.name}</h2>
                      <p className="text-slate-600">{sel.patient.diagnosis}</p>
                      <p className="text-sm text-slate-500 mt-1">{sel.patient.age}{sel.patient.sex} | {sel.patient.mrn} | {sel.patient.histology}</p>
                    </div>
                    {sel.stage && <div className="text-right"><p className="text-4xl font-bold text-rose-600">{sel.stage.overall}</p><p className="text-sm text-slate-500">{sel.stage.t} {sel.stage.n} {sel.stage.m}</p></div>}
                  </div>
                </div>

                <div className="flex border-b">
                  {[{id:'overview',label:'Overview',icon:FileText},{id:'staging',label:'TNM',icon:Target},{id:'recist',label:'RECIST',icon:Activity},{id:'team',label:'MDT',icon:Users},{id:'summary',label:'Summary',icon:ClipboardList}].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${tab === t.id ? 'border-rose-500 text-rose-600 bg-rose-50/50' : 'border-transparent text-slate-500'}`}><t.icon size={16} />{t.label}</button>
                  ))}
                </div>

                <div className="p-5">
                  {tab === 'overview' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <h3 className="font-medium mb-3">Clinical Info</h3>
                          <p className="text-sm"><span className="text-slate-500">Site:</span> {sel.patient.primary_site}</p>
                          <p className="text-sm"><span className="text-slate-500">Histology:</span> {sel.patient.histology}</p>
                          <p className="text-sm"><span className="text-slate-500">Referring:</span> {sel.patient.referring_md}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <h3 className="font-medium mb-3">MDT Team ({sel.team.length})</h3>
                          <div className="flex flex-wrap gap-2">{sel.team.map(t => <span key={t.id} className={`px-3 py-1 rounded-full text-xs font-medium ${roleColor(t.role)}`}>{t.name}</span>)}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {recist && (
                          <div className={`p-4 rounded-lg border ${recist.response.includes('PR') || recist.response.includes('CR') ? 'bg-green-50 border-green-200' : recist.response.includes('PD') ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <h3 className="font-medium mb-2">Response</h3>
                            <p className={`text-lg font-bold ${recist.response.includes('PR') ? 'text-green-700' : recist.response.includes('PD') ? 'text-red-700' : ''}`}>{recist.response}</p>
                            <p className="text-sm text-slate-500">{recist.pct > 0 ? '+' : ''}{recist.pct}%</p>
                          </div>
                        )}
                        {sel.action_items.length > 0 && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <h3 className="font-medium text-amber-800 mb-2"><AlertTriangle size={16} className="inline" /> Pending</h3>
                            {sel.action_items.map((a, i) => <p key={i} className="text-sm text-amber-700">- {a}</p>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'staging' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Cancer Type:</label>
                        <select value={cancer} onChange={e => setCancer(e.target.value as any)} className="px-3 py-2 border rounded-lg">
                          {Object.entries(TNM).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <div><label className="block text-sm font-medium mb-2">T</label><select value={stg.t} onChange={e => setStg(p => ({...p, t: e.target.value}))} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option>{TNM[cancer].T.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label className="block text-sm font-medium mb-2">N</label><select value={stg.n} onChange={e => setStg(p => ({...p, n: e.target.value}))} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option>{TNM[cancer].N.map(n => <option key={n}>{n}</option>)}</select></div>
                        <div><label className="block text-sm font-medium mb-2">M</label><select value={stg.m} onChange={e => setStg(p => ({...p, m: e.target.value}))} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option>{TNM[cancer].M.map(m => <option key={m}>{m}</option>)}</select></div>
                      </div>
                      {stg.t && stg.n && stg.m && (
                        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center">
                          <p className="text-sm text-rose-600 mb-2">Overall Stage</p>
                          <p className="text-5xl font-bold text-rose-700">Stage {calcStage(stg.t, stg.n, stg.m)}</p>
                          <button 
                            onClick={async () => {
                              setSaving(true)
                              try {
                                await api.patch(`/tumor-board/cases/${sel.id}`, { 
                                  stage_t: stg.t, stage_n: stg.n, stage_m: stg.m, stage_overall: calcStage(stg.t, stg.n, stg.m) 
                                })
                                setCases(prev => prev.map(c => c.id === sel.id ? { ...c, stage: { ...c.stage!, t: stg.t, n: stg.n, m: stg.m, overall: calcStage(stg.t, stg.n, stg.m) } } : c))
                              } catch (err) { console.error(err) }
                              finally { setSaving(false) }
                            }} 
                            disabled={saving}
                            className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Staging'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'recist' && (
                    <div className="space-y-4">
                      {sel.measurements.length > 0 ? (
                        <>
                          <table className="w-full text-sm">
                            <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Lesion</th><th className="text-left py-2 px-3">Location</th><th className="text-right py-2 px-3">Long</th><th className="text-right py-2 px-3">Short</th><th className="text-center py-2 px-3">Type</th></tr></thead>
                            <tbody>
                              {sel.measurements.map(m => (
                                <tr key={m.id} className="border-b hover:bg-slate-50">
                                  <td className="py-2 px-3 font-medium">{m.lesion_id}</td>
                                  <td className="py-2 px-3">{m.location}</td>
                                  <td className="py-2 px-3 text-right font-mono">{m.long_axis}mm</td>
                                  <td className="py-2 px-3 text-right font-mono">{m.short_axis}mm</td>
                                  <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 text-xs rounded ${m.type === 'target' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100'}`}>{m.type}</span></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot><tr className="bg-slate-100"><td colSpan={2} className="py-2 px-3 font-medium">Sum LD</td><td className="py-2 px-3 text-right font-bold">{sel.measurements.filter(m => m.type === 'target').reduce((s,m) => s + m.long_axis, 0)}mm</td><td colSpan={2}></td></tr></tfoot>
                          </table>
                          {recist && <div className={`p-4 rounded-lg border text-center ${recist.response.includes('PR') ? 'bg-green-50' : recist.response.includes('PD') ? 'bg-red-50' : 'bg-slate-50'}`}><p className="text-2xl font-bold">{recist.response}</p><p className="text-slate-500">{recist.bSum}mm → {recist.cSum}mm ({recist.pct > 0 ? '+' : ''}{recist.pct}%)</p></div>}
                        </>
                      ) : <p className="text-center text-slate-500 py-8">No measurements recorded</p>}
                    </div>
                  )}

                  {tab === 'team' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        {sel.team.map(tm => (
                          <div key={tm.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColor(tm.role)}`}>{tm.role}</span>
                              <span className="font-medium">{tm.name}</span>
                              {recs[tm.id] && <CheckCircle size={14} className="text-green-500 ml-auto" />}
                            </div>
                            <textarea value={recs[tm.id] || ''} onChange={e => setRecs(p => ({...p, [tm.id]: e.target.value}))} placeholder={`${tm.role} recommendation...`} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                        ))}
                      </div>
                      <div className="p-5 border-2 border-rose-200 rounded-xl bg-rose-50">
                        <h3 className="font-semibold text-rose-800 mb-3"><CheckCircle size={18} className="inline" /> MDT Consensus</h3>
                        <textarea value={consensus} onChange={e => setConsensus(e.target.value)} placeholder="Document consensus and treatment plan..." rows={4} className="w-full px-4 py-3 border rounded-lg text-sm" />
                        <button onClick={saveConsensus} disabled={saving} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Consensus'}</button>
                      </div>
                    </div>
                  )}

                  {tab === 'summary' && (
                    <div className="space-y-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => navigator.clipboard.writeText(summary())} className="px-4 py-2 bg-slate-100 rounded-lg flex items-center gap-2"><Edit3 size={16} />Copy</button>
                        <button className="px-4 py-2 bg-slate-100 rounded-lg flex items-center gap-2"><Download size={16} />Export</button>
                        <button className="px-4 py-2 bg-rose-600 text-white rounded-lg flex items-center gap-2"><Share2 size={16} />Share</button>
                      </div>
                      <pre className="p-6 bg-slate-900 text-green-400 rounded-xl text-sm font-mono whitespace-pre-wrap">{summary()}</pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-16 flex flex-col items-center justify-center text-slate-400">
                <Users size={72} className="mb-4" />
                <h3 className="text-xl font-medium text-slate-600">Select a Case</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
