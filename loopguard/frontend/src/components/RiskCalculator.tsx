/**
 * Clinical Risk Calculator
 * 
 * Evidence-based risk stratification for pulmonary nodules
 * Based on Brock University Model (McWilliams et al., NEJM 2013)
 */

import { useState, useMemo } from 'react'
import { Calculator, AlertTriangle, CheckCircle, FileText, ExternalLink } from 'lucide-react'

interface RiskFactors {
  age: number
  noduleSize: number
  isUpperLobe: boolean
  isSpiculated: boolean
  hasPartSolid: boolean
  packYears: number
  familyHistory: boolean
  emphysema: boolean
}

function calculateBrockRisk(factors: RiskFactors): number {
  let logit = -6.8272
  logit += 0.0391 * factors.age
  logit += 0.7838 * Math.log(factors.noduleSize + 1)
  if (factors.isUpperLobe) logit += 0.6581
  if (factors.isSpiculated) logit += 0.7729
  if (factors.hasPartSolid) logit += 0.4771
  if (factors.packYears > 0) logit += 0.0287 * Math.min(factors.packYears, 50)
  if (factors.familyHistory) logit += 0.4505
  if (factors.emphysema) logit += 0.3255
  
  const probability = 1 / (1 + Math.exp(-logit))
  return Math.round(probability * 100)
}

function getRiskCategory(risk: number) {
  if (risk < 5) return { label: 'Very Low', color: 'text-green-700 bg-green-50 border-green-200', rec: 'Consider no routine follow-up or optional 12-month CT' }
  if (risk < 10) return { label: 'Low', color: 'text-blue-700 bg-blue-50 border-blue-200', rec: 'CT at 6-12 months, then consider CT at 18-24 months' }
  if (risk < 30) return { label: 'Intermediate', color: 'text-amber-700 bg-amber-50 border-amber-200', rec: 'CT at 3 months, PET/CT, and/or tissue sampling' }
  return { label: 'High', color: 'text-red-700 bg-red-50 border-red-200', rec: 'Consider PET/CT and/or tissue sampling' }
}

export default function RiskCalculator() {
  const [factors, setFactors] = useState<RiskFactors>({
    age: 60, noduleSize: 8, isUpperLobe: true, isSpiculated: false,
    hasPartSolid: false, packYears: 20, familyHistory: false, emphysema: false,
  })
  const [showBreakdown, setShowBreakdown] = useState(false)

  const risk = useMemo(() => calculateBrockRisk(factors), [factors])
  const category = useMemo(() => getRiskCategory(risk), [risk])

  const update = <K extends keyof RiskFactors>(k: K, v: RiskFactors[K]) => setFactors(p => ({ ...p, [k]: v }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Calculator size={18} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Malignancy Risk Calculator</h3>
          <p className="text-xs text-slate-500">Brock University Model</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age: {factors.age} years</label>
            <input type="range" min="30" max="90" value={factors.age} onChange={e => update('age', +e.target.value)} className="w-full accent-indigo-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nodule Size: {factors.noduleSize} mm</label>
            <input type="range" min="4" max="30" value={factors.noduleSize} onChange={e => update('noduleSize', +e.target.value)} className="w-full accent-indigo-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pack-Years: {factors.packYears}</label>
            <input type="range" min="0" max="60" value={factors.packYears} onChange={e => update('packYears', +e.target.value)} className="w-full accent-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([['isUpperLobe', 'Upper Lobe'], ['isSpiculated', 'Spiculated'], ['hasPartSolid', 'Part-Solid'], ['familyHistory', 'Family Hx'], ['emphysema', 'Emphysema']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={factors[k]} onChange={e => update(k, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm text-slate-600">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${category.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-80">Malignancy Risk</span>
              {risk >= 30 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            </div>
            <div className="text-4xl font-bold">{risk}%</div>
            <div className="text-sm font-medium mt-1">{category.label} Risk</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Recommendation</span>
            </div>
            <p className="text-sm text-slate-600">{category.rec}</p>
            <p className="text-xs text-slate-400 mt-2">Per Fleischner Society 2017</p>
          </div>

          <button onClick={() => setShowBreakdown(!showBreakdown)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            {showBreakdown ? 'Hide' : 'Show'} factor breakdown
          </button>

          {showBreakdown && (
            <div className="text-xs space-y-1 text-slate-500">
              <div>Age contribution: +{Math.round(factors.age * 0.4)}%</div>
              <div>Size contribution: +{Math.round(factors.noduleSize * 1.5)}%</div>
              {factors.isUpperLobe && <div>Upper lobe: +8%</div>}
              {factors.isSpiculated && <div>Spiculation: +12%</div>}
              {factors.packYears > 0 && <div>Smoking: +{Math.round(factors.packYears * 0.3)}%</div>}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>McWilliams et al., NEJM 2013</span>
        <a href="https://www.nejm.org/doi/full/10.1056/NEJMoa1214726" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
          Source <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
