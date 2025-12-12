/**
 * Reference Hub
 * 
 * Comprehensive clinical reference for radiologists:
 * - 3D Anatomy Atlas (Zygote Body)
 * - Normal Measurements
 * - Imaging Protocols
 * - Emergency Protocols
 * - External Resources
 */

import { useState } from 'react'
import { 
  BookOpen, 
  Ruler, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Heart,
  Activity,
  Bone,
  Brain
} from 'lucide-react'

type TabId = 'anatomy' | 'measurements' | 'protocols' | 'emergency' | 'resources'

interface MeasurementCategory {
  id: string
  name: string
  icon: React.ReactNode
  items: { structure: string; normal: string; notes?: string }[]
}

const MEASUREMENTS: MeasurementCategory[] = [
  {
    id: 'vascular',
    name: 'Vascular',
    icon: <Heart size={18} />,
    items: [
      { structure: 'Aortic Root', normal: '< 4.0 cm', notes: 'Sinuses of Valsalva' },
      { structure: 'Ascending Aorta', normal: '< 3.7 cm' },
      { structure: 'Abdominal Aorta', normal: '< 3.0 cm', notes: 'Infrarenal' },
      { structure: 'Main PA', normal: '< 2.9 cm' },
      { structure: 'Portal Vein', normal: '< 13 mm' },
    ]
  },
  {
    id: 'organs',
    name: 'Solid Organs',
    icon: <Activity size={18} />,
    items: [
      { structure: 'Liver', normal: '< 16 cm', notes: 'Craniocaudal' },
      { structure: 'Spleen', normal: '< 12 cm' },
      { structure: 'Kidney', normal: '9 - 12 cm' },
      { structure: 'CBD', normal: '< 6 mm', notes: '+1mm per decade > 60' },
    ]
  },
  {
    id: 'neuro',
    name: 'Neuroimaging',
    icon: <Brain size={18} />,
    items: [
      { structure: 'Pituitary', normal: '< 9 mm' },
      { structure: 'Third Ventricle', normal: '< 7 mm' },
      { structure: 'Optic Nerve Sheath', normal: '< 5.5 mm' },
    ]
  },
]

const PROTOCOLS = [
  {
    category: 'CT Protocols',
    protocols: [
      { name: 'CT A/P Routine', phases: 'Portal venous (70s)', notes: 'Standard' },
      { name: 'CT PE Protocol', phases: 'CTA timing (PA bolus track)', notes: '100-150 HU in PA' },
      { name: 'Liver (LI-RADS)', phases: 'Non-con, Art (25s), PV (70s), Delayed (3min)', notes: 'HCC surveillance' },
    ]
  },
  {
    category: 'MRI Protocols',
    protocols: [
      { name: 'MRI Liver', phases: 'T2, T1 in/out, DWI, Dynamic Gd', notes: 'LI-RADS' },
      { name: 'MRI Prostate', phases: 'T2, DWI, DCE', notes: 'PI-RADS v2.1' },
    ]
  },
]

const EMERGENCY_PROTOCOLS = [
  {
    title: 'Contrast Reaction - Mild',
    symptoms: 'Urticaria, pruritis, nausea',
    actions: [
      'Monitor vitals',
      'Diphenhydramine 25-50mg IV/IM/PO',
      'Observe 30 minutes',
    ]
  },
  {
    title: 'Contrast Reaction - Severe',
    symptoms: 'Bronchospasm, laryngeal edema, hypotension',
    actions: [
      'Call code',
      'Epinephrine 0.3mg IM - FIRST LINE',
      'IV fluids wide open',
      'Oxygen 6-10 L/min',
    ]
  },
  {
    title: 'Extravasation',
    symptoms: 'Pain, swelling at injection site',
    actions: [
      'Stop injection',
      'Elevate extremity',
      'Ice packs',
    ]
  },
]

const EXTERNAL_RESOURCES = [
  { name: 'Radiopaedia', url: 'https://radiopaedia.org', description: 'Radiology encyclopedia & cases' },
  { name: 'ACR Guidelines', url: 'https://www.acr.org/Clinical-Resources/ACR-Appropriateness-Criteria', description: 'Imaging appropriateness criteria' },
  { name: 'Fleischner Society', url: 'https://fleischner.memberclicks.net', description: 'Pulmonary nodule guidelines' },
  { name: 'LI-RADS', url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS', description: 'Liver reporting system' },
]

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState<TabId>('anatomy')
  const [measurementSearch, setMeasurementSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('vascular')
  const [protocolSearch, setProtocolSearch] = useState('')

  const tabs = [
    { id: 'anatomy' as TabId, label: '3D Anatomy', icon: <Bone size={16} /> },
    { id: 'measurements' as TabId, label: 'Measurements', icon: <Ruler size={16} /> },
    { id: 'protocols' as TabId, label: 'Protocols', icon: <FileText size={16} /> },
    { id: 'emergency' as TabId, label: 'Emergency', icon: <AlertCircle size={16} /> },
    { id: 'resources' as TabId, label: 'Resources', icon: <ExternalLink size={16} /> },
  ]

  const filteredMeasurements = MEASUREMENTS.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.structure.toLowerCase().includes(measurementSearch.toLowerCase()) ||
      item.normal.toLowerCase().includes(measurementSearch.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <BookOpen size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Clinical Reference</h1>
            <p className="text-sm text-slate-500">Quick access to anatomy, measurements, and protocols</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-violet-600 text-violet-600' 
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        
        {/* 3D Anatomy */}
        {activeTab === 'anatomy' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Interactive 3D Anatomy Atlas</h2>
                  <p className="text-sm text-slate-500">Zygote Body - Explore all body systems in detail</p>
                </div>
                <a 
                  href="https://www.zygotebody.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  Open in new tab <ExternalLink size={14} />
                </a>
              </div>
              <iframe 
                src="https://www.zygotebody.com/" 
                className="w-full h-[700px]"
                title="Zygote Body 3D Anatomy"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <a href="https://human.biodigital.com/explore" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-slate-900">BioDigital Human</h3>
                <p className="text-sm text-slate-500 mt-1">Advanced 3D anatomy with disease models</p>
              </a>
              <a href="https://www.openanatomy.org/" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-slate-900">Open Anatomy Project</h3>
                <p className="text-sm text-slate-500 mt-1">Research-grade open source atlases</p>
              </a>
              <a href="https://radiopaedia.org/articles/anatomy" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-slate-900">Radiopaedia Anatomy</h3>
                <p className="text-sm text-slate-500 mt-1">Radiology-focused anatomy articles</p>
              </a>
            </div>
          </div>
        )}

        {/* Measurements */}
        {activeTab === 'measurements' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search measurements (e.g., aorta, liver, portal vein)..."
                  value={measurementSearch}
                  onChange={e => setMeasurementSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredMeasurements.map(category => (
                <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{category.icon}</div>
                      <span className="font-medium text-slate-900">{category.name}</span>
                      <span className="text-sm text-slate-400">{category.items.length} items</span>
                    </div>
                    {expandedCategory === category.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  
                  {expandedCategory === category.id && (
                    <div className="border-t border-slate-100">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Structure</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Normal Values</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {category.items.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm font-medium text-slate-900">{item.structure}</td>
                              <td className="px-4 py-2 text-sm text-slate-700 font-mono">{item.normal}</td>
                              <td className="px-4 py-2 text-sm text-slate-500">{item.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protocols */}
        {activeTab === 'protocols' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search protocols (e.g., renal mass, PE, liver)..."
                  value={protocolSearch}
                  onChange={e => setProtocolSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {PROTOCOLS.map((cat, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">{cat.category}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {cat.protocols
                    .filter(p => 
                      protocolSearch === '' ||
                      p.name.toLowerCase().includes(protocolSearch.toLowerCase()) ||
                      p.phases.toLowerCase().includes(protocolSearch.toLowerCase())
                    )
                    .map((protocol, j) => (
                    <div key={j} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{protocol.name}</h4>
                          <p className="text-sm text-violet-600 mt-1">{protocol.phases}</p>
                          {protocol.notes && <p className="text-sm text-slate-500 mt-1">{protocol.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emergency */}
        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle size={20} />
                <span className="font-semibold">Emergency Reference - For guidance only. Follow institutional protocols.</span>
              </div>
            </div>

            {EMERGENCY_PROTOCOLS.map((protocol, i) => (
              <div key={i} className={`bg-white rounded-xl border overflow-hidden ${
                protocol.title.includes('Severe') ? 'border-red-300' : 'border-slate-200'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  protocol.title.includes('Severe') ? 'bg-red-50 border-red-200' :
                  protocol.title.includes('Moderate') ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-100'
                }`}>
                  <h3 className="font-semibold text-slate-900">{protocol.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{protocol.symptoms}</p>
                </div>
                <div className="p-4">
                  <ol className="space-y-2">
                    {protocol.actions.map((action, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          protocol.title.includes('Severe') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>{j + 1}</span>
                        <span className="text-sm text-slate-700">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resources */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-2 gap-4">
            {EXTERNAL_RESOURCES.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-violet-300 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-violet-600">{resource.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{resource.description}</p>
                  </div>
                  <ExternalLink size={16} className="text-slate-400 group-hover:text-violet-600" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
