/**
 * Radiologist Reading Panel
 * 
 * Professional clinical interface for creating follow-up recommendations.
 * Designed for speed and accuracy in high-volume reading environments.
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { 
  FileText, 
  AlertTriangle, 
  Check, 
  Search,
  Zap,
  RotateCcw,
  Send
} from 'lucide-react'

// Types
interface ExtractedRecommendation {
  modality: string
  body_region: string
  interval_months: number
  finding: string
  urgency: string
  guideline: string | null
  confidence: number
}

interface QuickTemplate {
  id: string
  label: string
  shortcut: string
  modality: string
  bodyRegion: string
  defaultInterval: number
  guideline?: string
}

// Quick action templates for common findings
const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'nodule', label: 'Pulmonary Nodule', shortcut: 'N', modality: 'CT', bodyRegion: 'Chest', defaultInterval: 3, guideline: 'Fleischner 2017' },
  { id: 'cyst', label: 'Renal Cyst', shortcut: 'C', modality: 'CT', bodyRegion: 'Abdomen', defaultInterval: 6, guideline: 'Bosniak 2019' },
  { id: 'thyroid', label: 'Thyroid Nodule', shortcut: 'T', modality: 'US', bodyRegion: 'Neck', defaultInterval: 12, guideline: 'TI-RADS' },
  { id: 'liver', label: 'Liver Lesion', shortcut: 'L', modality: 'MRI', bodyRegion: 'Abdomen', defaultInterval: 3, guideline: 'LI-RADS' },
  { id: 'adrenal', label: 'Adrenal Mass', shortcut: 'A', modality: 'CT', bodyRegion: 'Abdomen', defaultInterval: 12, guideline: 'ACR' },
  { id: 'pancreas', label: 'Pancreatic Cyst', shortcut: 'P', modality: 'MRI', bodyRegion: 'Abdomen', defaultInterval: 6, guideline: 'ACR' },
]

const INTERVALS = [
  { value: 1, label: '1 mo' },
  { value: 3, label: '3 mo' },
  { value: 6, label: '6 mo' },
  { value: 12, label: '12 mo' },
  { value: 24, label: '24 mo' },
]

const PRIORITIES = [
  { value: 'routine', label: 'Routine', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'urgent', label: 'Urgent', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'stat', label: 'STAT', color: 'bg-red-50 text-red-700 border-red-300' },
]

// Mock study context
const CURRENT_STUDY = {
  patientName: 'Smith, John',
  patientMrn: 'MRN-12345',
  patientDob: '1966-03-15',
  studyDescription: 'CT Chest w/ Contrast',
  studyDate: '2024-01-15',
  accessionNumber: 'ACC-2024-001',
  priorStudies: 4,
  pendingFollowups: 1,
}

export default function RadiologistPanelPage() {
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [modality, setModality] = useState('CT')
  const [bodyRegion, setBodyRegion] = useState('Chest')
  const [interval, setInterval] = useState(3)
  const [priority, setPriority] = useState('routine')
  const [finding, setFinding] = useState('')
  const [guideline, setGuideline] = useState('')
  
  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // AI state
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<ExtractedRecommendation[]>([])

  // Apply quick template
  const applyTemplate = useCallback((template: QuickTemplate) => {
    setSelectedTemplate(template.id)
    setModality(template.modality)
    setBodyRegion(template.bodyRegion)
    setInterval(template.defaultInterval)
    setGuideline(template.guideline || '')
    setFinding('')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const template = QUICK_TEMPLATES.find(t => t.shortcut.toLowerCase() === e.key.toLowerCase())
      if (template) {
        e.preventDefault()
        applyTemplate(template)
      }
      
      if (e.key === 'Escape') {
        resetForm()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [applyTemplate])

  const resetForm = () => {
    setSelectedTemplate(null)
    setModality('CT')
    setBodyRegion('Chest')
    setInterval(3)
    setPriority('routine')
    setFinding('')
    setGuideline('')
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async () => {
    if (!finding.trim()) {
      setError('Clinical finding is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await api.post('/followups', {
        report_id: '550e8400-e29b-41d4-a716-446655440002',
        recommended_modality: modality,
        body_region: bodyRegion,
        reason: `${finding}${guideline ? ` [${guideline}]` : ''}`,
        interval_months: interval,
        priority,
      })
      
      setSuccess(true)
      setTimeout(() => {
        resetForm()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recommendation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAiAnalyze = async () => {
    if (!aiInput.trim()) return
    
    setAiLoading(true)
    setAiResults([])
    
    try {
      const response = await api.post<{ recommendations: ExtractedRecommendation[] }>('/ai/analyze-report', {
        impression_text: aiInput,
      })
      setAiResults(response.recommendations)
    } catch (err) {
      console.error('AI analysis failed:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiResult = (rec: ExtractedRecommendation) => {
    setModality(rec.modality)
    setBodyRegion(rec.body_region)
    setInterval(rec.interval_months)
    setPriority(rec.urgency)
    setFinding(rec.finding)
    setGuideline(rec.guideline || '')
    setSelectedTemplate(null)
    setAiResults([])
    setAiInput('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Reading Panel</h1>
            <p className="text-sm text-slate-500">Create follow-up recommendations</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-100 rounded">Press letter keys for quick templates</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Column - Patient Context */}
            <div className="col-span-4 space-y-4">
              
              {/* Current Study */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Current Study</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{CURRENT_STUDY.patientName}</p>
                    <p className="text-sm text-slate-500">{CURRENT_STUDY.patientMrn} | DOB: {CURRENT_STUDY.patientDob}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-800">{CURRENT_STUDY.studyDescription}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {CURRENT_STUDY.studyDate} | {CURRENT_STUDY.accessionNumber}
                    </p>
                  </div>
                  <div className="flex gap-4 pt-2 text-xs">
                    <span className="text-slate-600">{CURRENT_STUDY.priorStudies} prior studies</span>
                    {CURRENT_STUDY.pendingFollowups > 0 && (
                      <span className="text-amber-600 font-medium">
                        {CURRENT_STUDY.pendingFollowups} pending follow-up
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Report Parser</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Paste impression text to extract recommendations..."
                    className="w-full text-sm border border-slate-200 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                  <button
                    onClick={handleAiAnalyze}
                    disabled={aiLoading || !aiInput.trim()}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search size={14} />
                        Parse Report
                      </>
                    )}
                  </button>
                  
                  {aiResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {aiResults.map((rec, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyAiResult(rec)}
                          className="w-full text-left p-3 border border-slate-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-800">
                              {rec.modality} {rec.body_region}
                            </span>
                            <span className="text-xs text-slate-500">{rec.interval_months} mo</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{rec.finding}</p>
                          {rec.guideline && (
                            <p className="text-xs text-blue-600 mt-1">{rec.guideline}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Recommendation Form */}
            <div className="col-span-8">
              <div className="bg-white border border-slate-200 rounded-lg">
                
                {/* Quick Templates */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Quick Templates</span>
                </div>
                <div className="p-4 border-b border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`px-3 py-2 text-left rounded-md border transition-colors ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{template.label}</span>
                          <kbd className="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                            {template.shortcut}
                          </kbd>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {template.modality} | {template.defaultInterval} mo
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-4 space-y-4">
                  
                  {/* Modality & Body Region */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Modality</label>
                      <select
                        value={modality}
                        onChange={(e) => setModality(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CT">CT</option>
                        <option value="MRI">MRI</option>
                        <option value="US">Ultrasound</option>
                        <option value="PET">PET/CT</option>
                        <option value="XR">X-Ray</option>
                        <option value="MG">Mammography</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Body Region</label>
                      <select
                        value={bodyRegion}
                        onChange={(e) => setBodyRegion(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Chest">Chest</option>
                        <option value="Abdomen">Abdomen</option>
                        <option value="Pelvis">Pelvis</option>
                        <option value="Brain">Brain</option>
                        <option value="Neck">Neck</option>
                        <option value="Spine">Spine</option>
                        <option value="Extremity">Extremity</option>
                      </select>
                    </div>
                  </div>

                  {/* Interval Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Interval</label>
                    <div className="flex gap-2">
                      {INTERVALS.map((int) => (
                        <button
                          key={int.value}
                          onClick={() => setInterval(int.value)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                            interval === int.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {int.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPriority(p.value)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                            priority === p.value
                              ? p.color + ' border-current'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Finding */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Finding</label>
                    <textarea
                      value={finding}
                      onChange={(e) => setFinding(e.target.value)}
                      placeholder="Describe the finding requiring follow-up..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* Guideline Reference */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Guideline Reference (optional)</label>
                    <input
                      type="text"
                      value={guideline}
                      onChange={(e) => setGuideline(e.target.value)}
                      placeholder="e.g., Fleischner Society 2017"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Preview */}
                  {finding && (
                    <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Recommendation Preview</p>
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{modality} {bodyRegion}</span> in <span className="font-medium">{interval} months</span>
                        {priority !== 'routine' && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            priority === 'stat' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {priority.toUpperCase()}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{finding}</p>
                      {guideline && (
                        <p className="text-xs text-slate-500 mt-1">Per {guideline}</p>
                      )}
                    </div>
                  )}

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <span className="text-sm text-green-700">Recommendation created successfully</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !finding.trim()}
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Create Recommendation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
