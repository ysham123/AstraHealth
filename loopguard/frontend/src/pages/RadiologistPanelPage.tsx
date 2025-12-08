/**
 * Enhanced Radiologist Panel Page
 * 
 * Features:
 * - Guideline-based templates (Fleischner, ACR, Bosniak, TI-RADS)
 * - Risk stratification
 * - Smart interval suggestions
 * - Recommendation preview with guideline citations
 */

import { useState } from 'react'
import { api } from '../api/client'
import { FileText, Plus, History, AlertCircle, BookOpen, AlertTriangle, Info, CheckCircle, Sparkles, Loader2 } from 'lucide-react'

// Types for AI analysis
interface ExtractedRecommendation {
  modality: string
  body_region: string
  interval_months: number
  finding: string
  urgency: string
  guideline: string | null
  confidence: number
}

// Mock current study data (in production, this would come from PACS/RIS integration)
const MOCK_STUDY = {
  patientName: 'Smith, John',
  patientMrn: 'MRN-12345',
  studyDescription: 'CT Chest w/ Contrast',
  studyDate: '2024-01-15',
  accessionNumber: 'ACC-2024-001',
}

const PRIOR_FOLLOWUPS = [
  {
    id: '1',
    modality: 'CT',
    bodyRegion: 'Chest',
    interval: '6 months',
    status: 'pending',
    dueDate: '2024-06-15',
  },
  {
    id: '2',
    modality: 'MRI',
    bodyRegion: 'Brain',
    interval: '1 year',
    status: 'completed',
    dueDate: '2023-12-01',
  },
]

// Guideline-based templates
const FINDING_TEMPLATES = {
  pulmonary_nodule: {
    name: 'Pulmonary Nodule (Fleischner)',
    guideline: 'Fleischner Society 2017',
    modality: 'CT',
    bodyRegion: 'Chest',
    options: [
      { label: '<6mm, low risk patient', interval: 0, note: 'No routine follow-up recommended' },
      { label: '<6mm, high risk patient', interval: 12, note: 'Optional CT at 12 months' },
      { label: '6-8mm, low risk', interval: 6, note: 'CT at 6-12 months, consider 18-24 mo' },
      { label: '6-8mm, high risk', interval: 3, note: 'CT at 3-6 months, then 18-24 mo' },
      { label: '>8mm (any risk)', interval: 3, note: 'CT at 3 months, PET/CT or biopsy' },
    ],
  },
  adrenal: {
    name: 'Adrenal Incidentaloma (ACR)',
    guideline: 'ACR Incidental Findings 2017',
    modality: 'CT',
    bodyRegion: 'Abdomen',
    options: [
      { label: '≤1cm, lipid-rich adenoma', interval: 0, note: 'No follow-up needed' },
      { label: '1-4cm, benign features', interval: 12, note: 'Optional 12 month follow-up' },
      { label: '1-4cm, indeterminate', interval: 0, note: 'Adrenal protocol CT or MRI now' },
      { label: '>4cm or suspicious', interval: 0, note: 'Surgical consultation' },
    ],
  },
  renal_cyst: {
    name: 'Renal Cyst (Bosniak 2019)',
    guideline: 'Bosniak Classification v2019',
    modality: 'CT',
    bodyRegion: 'Abdomen',
    options: [
      { label: 'Bosniak I - Simple cyst', interval: 0, note: 'No follow-up needed' },
      { label: 'Bosniak II - Minimally complex', interval: 0, note: 'No follow-up needed' },
      { label: 'Bosniak IIF - Mildly complex', interval: 6, note: 'CT/MRI at 6mo, then annually x5 yrs' },
      { label: 'Bosniak III - Indeterminate', interval: 0, note: 'Surgical evaluation or active surveillance' },
      { label: 'Bosniak IV - Clearly malignant', interval: 0, note: 'Surgical resection' },
    ],
  },
  thyroid: {
    name: 'Thyroid Nodule (TI-RADS)',
    guideline: 'ACR TI-RADS 2017',
    modality: 'US',
    bodyRegion: 'Neck',
    options: [
      { label: 'TR1 Benign', interval: 0, note: 'No FNA, no follow-up' },
      { label: 'TR2 Not suspicious', interval: 0, note: 'No FNA, no follow-up' },
      { label: 'TR3 Mildly suspicious ≥2.5cm', interval: 0, note: 'FNA recommended' },
      { label: 'TR4 Moderately suspicious ≥1.5cm', interval: 0, note: 'FNA recommended' },
      { label: 'TR5 Highly suspicious ≥1cm', interval: 0, note: 'FNA recommended' },
    ],
  },
  liver: {
    name: 'Liver Lesion (LI-RADS)',
    guideline: 'ACR LI-RADS v2018',
    modality: 'MRI',
    bodyRegion: 'Abdomen',
    options: [
      { label: 'LR-1 Definitely benign', interval: 0, note: 'No further workup' },
      { label: 'LR-2 Probably benign', interval: 0, note: 'No further workup' },
      { label: 'LR-3 Intermediate probability', interval: 3, note: 'Repeat in 3-6 months' },
      { label: 'LR-4 Probably HCC', interval: 0, note: 'MDT, consider biopsy' },
      { label: 'LR-5 Definitely HCC', interval: 0, note: 'Treatment, no biopsy needed' },
    ],
  },
  pancreatic_cyst: {
    name: 'Pancreatic Cyst (ACR)',
    guideline: 'ACR Incidental Findings 2017',
    modality: 'MRI',
    bodyRegion: 'Abdomen',
    options: [
      { label: '<1.5cm, no worrisome features', interval: 24, note: 'MRI in 2 years, then q2y' },
      { label: '1.5-2.5cm, no worrisome features', interval: 12, note: 'MRI in 1 year, then q2y' },
      { label: '>2.5cm or worrisome features', interval: 0, note: 'EUS or surgical consult' },
    ],
  },
  custom: {
    name: 'Custom / Other Finding',
    guideline: 'Radiologist discretion',
    modality: 'CT',
    bodyRegion: 'Chest',
    options: [],
  },
}

type FindingType = keyof typeof FINDING_TEMPLATES

export default function RadiologistPanelPage() {
  const [showForm, setShowForm] = useState(false)
  const [findingType, setFindingType] = useState<FindingType>('pulmonary_nodule')
  const [selectedOption, setSelectedOption] = useState(0)
  const [formData, setFormData] = useState({
    modality: 'CT',
    bodyRegion: 'Chest',
    reason: '',
    intervalMonths: 3,
    priority: 'routine',
    measurementMm: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // AI Report Analyzer state
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [reportText, setReportText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResults, setAiResults] = useState<ExtractedRecommendation[]>([])
  const [aiError, setAiError] = useState<string | null>(null)

  const template = FINDING_TEMPLATES[findingType]
  const currentOption = template.options[selectedOption]

  const handleTemplateChange = (type: FindingType) => {
    setFindingType(type)
    setSelectedOption(0)
    const t = FINDING_TEMPLATES[type]
    const firstOpt = t.options[0]
    setFormData({
      ...formData,
      modality: t.modality,
      bodyRegion: t.bodyRegion,
      intervalMonths: firstOpt?.interval || 3,
      reason: firstOpt?.note || '',
    })
  }

  const handleOptionChange = (index: number) => {
    setSelectedOption(index)
    const opt = template.options[index]
    if (opt) {
      setFormData({
        ...formData,
        intervalMonths: opt.interval,
        reason: opt.note,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    
    if (formData.intervalMonths === 0 && findingType !== 'custom') {
      setError('This finding does not require imaging follow-up per guidelines.')
      setSubmitting(false)
      return
    }
    
    try {
      const reasonWithCitation = `[${template.guideline}] ${formData.reason}${formData.measurementMm ? ` (${formData.measurementMm}mm)` : ''}`
      
      await api.post('/followups', {
        report_id: '00000000-0000-0000-0000-000000000001',
        recommended_modality: formData.modality,
        body_region: formData.bodyRegion,
        reason: reasonWithCitation,
        interval_months: formData.intervalMonths,
        priority: formData.priority,
      })
      setSuccess(true)
      setShowForm(false)
      setFormData({
        modality: 'CT',
        bodyRegion: 'Chest',
        reason: '',
        intervalMonths: 3,
        priority: 'routine',
        measurementMm: '',
      })
      setFindingType('pulmonary_nodule')
      setSelectedOption(0)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create follow-up'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateClick = () => {
    setShowForm(true)
    setError(null)
  }

  // AI Report Analyzer function
  const handleAnalyzeReport = async () => {
    if (!reportText.trim()) {
      setAiError('Please enter report text to analyze')
      return
    }
    
    setAnalyzing(true)
    setAiError(null)
    setAiResults([])
    
    try {
      const response = await api.post<{ recommendations: ExtractedRecommendation[], source: string }>('/ai/analyze-report', {
        impression_text: reportText,
      })
      setAiResults(response.recommendations)
      if (response.recommendations.length === 0) {
        setAiError('No follow-up recommendations found in the report text')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze report'
      setAiError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Apply AI result to form
  const applyAiResult = (rec: ExtractedRecommendation) => {
    setFormData({
      modality: rec.modality,
      bodyRegion: rec.body_region,
      reason: `${rec.finding}${rec.guideline ? ` [${rec.guideline}]` : ''}`,
      intervalMonths: rec.interval_months,
      priority: rec.urgency,
      measurementMm: '',
    })
    setFindingType('custom')
    setShowForm(true)
    setShowAnalyzer(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reading Assistant</h1>

      {/* Current Study Info */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{MOCK_STUDY.studyDescription}</h2>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Patient:</span>{' '}
                <span className="font-medium">{MOCK_STUDY.patientName}</span>
              </div>
              <div>
                <span className="text-gray-500">MRN:</span>{' '}
                <span className="font-medium">{MOCK_STUDY.patientMrn}</span>
              </div>
              <div>
                <span className="text-gray-500">Study Date:</span>{' '}
                <span className="font-medium">{MOCK_STUDY.studyDate}</span>
              </div>
              <div>
                <span className="text-gray-500">Accession:</span>{' '}
                <span className="font-medium">{MOCK_STUDY.accessionNumber}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle size={20} />
          Follow-up recommendation created successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* AI Report Analyzer */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold">AI Report Analyzer</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <button
            onClick={() => setShowAnalyzer(!showAnalyzer)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showAnalyzer ? 'Hide' : 'Expand'}
          </button>
        </div>

        {showAnalyzer && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Paste your report impression text below and let AI extract follow-up recommendations automatically.
            </p>
            
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="input"
              rows={4}
              placeholder="e.g., 8mm pulmonary nodule in RLL. Recommend CT chest in 3 months per Fleischner guidelines. 2cm hepatic cyst, benign, no follow-up needed."
            />
            
            <button
              onClick={handleAnalyzeReport}
              disabled={analyzing}
              className="btn-primary flex items-center gap-2"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {analyzing ? 'Analyzing...' : 'Analyze Report'}
            </button>

            {aiError && (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {aiError}
              </div>
            )}

            {aiResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Extracted Recommendations:</p>
                {aiResults.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-purple-900">
                        {rec.modality} {rec.body_region} in {rec.interval_months} months
                      </p>
                      <p className="text-sm text-purple-700">{rec.finding}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          rec.urgency === 'stat' ? 'bg-red-100 text-red-700' :
                          rec.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rec.urgency}
                        </span>
                        {rec.guideline && (
                          <span className="text-xs text-purple-600">{rec.guideline}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => applyAiResult(rec)}
                      className="btn-primary text-sm"
                    >
                      Use This
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prior Follow-ups */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} className="text-gray-500" />
          <h3 className="text-lg font-semibold">Prior Follow-up Recommendations</h3>
        </div>
        
        {PRIOR_FOLLOWUPS.length > 0 ? (
          <div className="space-y-3">
            {PRIOR_FOLLOWUPS.map((followup) => (
              <div
                key={followup.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {followup.modality} {followup.bodyRegion}
                  </p>
                  <p className="text-sm text-gray-500">
                    Interval: {followup.interval} • Due: {followup.dueDate}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    followup.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {followup.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No prior follow-ups for this patient</p>
        )}
      </div>

      {/* Create Follow-up */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New Follow-up Recommendation</h3>
          {!showForm && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Create
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Finding Type Selector */}
            <div>
              <label className="label flex items-center gap-2">
                <BookOpen size={16} />
                Finding Type (Guideline-Based)
              </label>
              <select
                value={findingType}
                onChange={(e) => handleTemplateChange(e.target.value as FindingType)}
                className="input"
              >
                {Object.entries(FINDING_TEMPLATES).map(([key, t]) => (
                  <option key={key} value={key}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Info size={12} />
                {template.guideline}
              </p>
            </div>

            {/* Characteristic Options */}
            {template.options.length > 0 && (
              <div>
                <label className="label">Finding Characteristics</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {template.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOption === idx
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="findingOption"
                        checked={selectedOption === idx}
                        onChange={() => handleOptionChange(idx)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.note}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                          opt.interval === 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {opt.interval === 0 ? 'No imaging follow-up' : `${opt.interval} month follow-up`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Measurement & Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Size (mm)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={formData.measurementMm}
                  onChange={(e) => setFormData({ ...formData, measurementMm: e.target.value })}
                  className="input"
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label className="label">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
              <div>
                <label className="label">Interval</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={formData.intervalMonths}
                  onChange={(e) => setFormData({ ...formData, intervalMonths: Number(e.target.value) })}
                  className="input"
                />
              </div>
            </div>

            {/* Override Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-orange-500" />
                <span className="text-xs font-medium text-gray-600">Override Modality/Region</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    value={formData.modality}
                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                    className="input text-sm"
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
                  <select
                    value={formData.bodyRegion}
                    onChange={(e) => setFormData({ ...formData, bodyRegion: e.target.value })}
                    className="input text-sm"
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
            </div>

            {/* Recommendation Preview */}
            {formData.intervalMonths > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Recommendation Preview</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {formData.modality} {formData.bodyRegion} in {formData.intervalMonths} months
                      {formData.measurementMm && ` (${formData.measurementMm}mm finding)`}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Per {template.guideline}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.intervalMonths === 0 && findingType !== 'custom' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 text-sm">No Follow-up Required</p>
                    <p className="text-sm text-green-700 mt-1">
                      {currentOption?.note || 'Per guidelines, no imaging follow-up is needed.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={submitting || (formData.intervalMonths === 0 && findingType !== 'custom')} 
                className={`btn-primary ${formData.intervalMonths === 0 && findingType !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Creating...' : 'Create Follow-up'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
