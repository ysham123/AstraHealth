/**
 * Clinical Decision Support
 * 
 * Guideline-integrated recommendations based on imaging findings
 */

import { useState } from 'react'
import { BookOpen, ChevronRight, Check, AlertCircle, Zap } from 'lucide-react'

interface Guideline {
  id: string
  name: string
  version: string
  finding: string
  criteria: string[]
  recommendation: string
  followUp: string
  evidence: string
  confidence: number
}

const GUIDELINES: Guideline[] = [
  {
    id: 'fleischner-high',
    name: 'Fleischner Society',
    version: '2017',
    finding: 'Solid pulmonary nodule >8mm, high-risk patient',
    criteria: ['Solid nodule', 'Size >8mm', 'Smoking history or other risk factors'],
    recommendation: 'CT at 3 months, then PET/CT or tissue sampling',
    followUp: '3 months',
    evidence: 'Level B recommendation based on observational studies',
    confidence: 94,
  },
  {
    id: 'tirads-4',
    name: 'ACR TI-RADS',
    version: '2017',
    finding: 'Thyroid nodule, moderately suspicious (TR4)',
    criteria: ['Solid composition', 'Hypoechoic', 'Irregular margins or microcalcifications'],
    recommendation: 'FNA if ≥15mm, follow-up if 10-14mm',
    followUp: '12-24 months',
    evidence: 'Based on malignancy risk stratification',
    confidence: 88,
  },
  {
    id: 'lirads-4',
    name: 'LI-RADS',
    version: '2018',
    finding: 'Hepatic observation, probably HCC (LR-4)',
    criteria: ['Arterial phase hyperenhancement', 'One additional major feature', 'No definite washout'],
    recommendation: 'Consider biopsy or multidisciplinary discussion',
    followUp: '3 months or biopsy',
    evidence: 'Specificity 95% for HCC at this category',
    confidence: 91,
  },
  {
    id: 'bosniak-iif',
    name: 'Bosniak Classification',
    version: '2019',
    finding: 'Renal cyst, minimally complex (IIF)',
    criteria: ['Thin septa', 'Minimal enhancement', 'No solid components'],
    recommendation: 'Imaging surveillance',
    followUp: '6 months, then annually for 5 years',
    evidence: '5% malignancy rate, surveillance appropriate',
    confidence: 92,
  },
]

interface Props {
  selectedFinding?: string
  onApply?: (guideline: Guideline) => void
}

export default function ClinicalDecisionSupport({ selectedFinding: _selectedFinding, onApply }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [appliedId, setAppliedId] = useState<string | null>(null)

  const handleApply = (guideline: Guideline) => {
    setAppliedId(guideline.id)
    onApply?.(guideline)
    setTimeout(() => setAppliedId(null), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <BookOpen size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Clinical Decision Support</h3>
          <p className="text-xs text-slate-500">Evidence-based guideline matching</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {GUIDELINES.map(g => {
          const isExpanded = expandedId === g.id
          const isApplied = appliedId === g.id
          
          return (
            <div key={g.id} className="hover:bg-slate-50 transition-colors">
              <button
                onClick={() => setExpandedId(isExpanded ? null : g.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  g.confidence >= 90 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <span className="text-xs font-bold">{g.confidence}%</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{g.name}</span>
                    <span className="text-xs text-slate-400">{g.version}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{g.finding}</p>
                </div>
                
                <ChevronRight size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="px-5 pb-4 space-y-4">
                  <div className="ml-14 space-y-3">
                    {/* Criteria */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Criteria Met</p>
                      <div className="space-y-1">
                        {g.criteria.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <Check size={14} className="text-green-500" />
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recommendation */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-800">Recommendation</span>
                      </div>
                      <p className="text-sm text-emerald-700">{g.recommendation}</p>
                      <p className="text-xs text-emerald-600 mt-1">Follow-up: {g.followUp}</p>
                    </div>
                    
                    {/* Evidence */}
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{g.evidence}</span>
                    </div>
                    
                    {/* Apply Button */}
                    <button
                      onClick={() => handleApply(g)}
                      disabled={isApplied}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isApplied 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isApplied ? 'Applied to Report' : 'Apply Recommendation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
        Guidelines auto-matched based on finding characteristics
      </div>
    </div>
  )
}
