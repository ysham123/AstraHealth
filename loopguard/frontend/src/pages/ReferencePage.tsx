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
      { structure: 'Aortic Root', normal: '< 4.0 cm', notes: 'Measured at sinuses of Valsalva' },
      { structure: 'Ascending Aorta', normal: '< 3.7 cm', notes: 'At level of PA bifurcation' },
      { structure: 'Aortic Arch', normal: '< 3.5 cm' },
      { structure: 'Descending Thoracic Aorta', normal: '< 2.8 cm' },
      { structure: 'Abdominal Aorta', normal: '< 3.0 cm (M), < 2.7 cm (F)', notes: 'Infrarenal' },
      { structure: 'Main Pulmonary Artery', normal: '< 2.9 cm', notes: 'At bifurcation level' },
      { structure: 'IVC', normal: '1.5 - 2.5 cm', notes: 'Intrahepatic segment' },
      { structure: 'Portal Vein', normal: '< 13 mm', notes: '> 13mm suggests portal HTN' },
      { structure: 'Common Iliac Artery', normal: '< 1.7 cm (M), < 1.5 cm (F)' },
      { structure: 'Splenic Vein', normal: '< 10 mm' },
      { structure: 'SMV', normal: '< 10 mm' },
    ]
  },
  {
    id: 'organs',
    name: 'Solid Organs',
    icon: <Activity size={18} />,
    items: [
      { structure: 'Liver (craniocaudal)', normal: '< 16 cm', notes: 'MCL, longitudinal' },
      { structure: 'Spleen', normal: '< 12 cm length, < 7 cm width', notes: '> 13cm = splenomegaly' },
      { structure: 'Kidney (length)', normal: '9 - 12 cm', notes: 'Left typically slightly larger' },
      { structure: 'Pancreas (head)', normal: '< 3.0 cm' },
      { structure: 'Pancreas (body)', normal: '< 2.5 cm' },
      { structure: 'Pancreas (tail)', normal: '< 2.0 cm' },
      { structure: 'Adrenal (limb width)', normal: '< 10 mm', notes: 'Body < 6mm' },
      { structure: 'CBD', normal: '< 6 mm', notes: 'Add 1mm per decade > 60yo' },
      { structure: 'Gallbladder Wall', normal: '< 3 mm', notes: 'Fasting, non-distended' },
      { structure: 'Main Pancreatic Duct', normal: '< 3 mm (head), < 2 mm (body/tail)' },
    ]
  },
  {
    id: 'thorax',
    name: 'Thorax',
    icon: <Activity size={18} />,
    items: [
      { structure: 'Trachea (coronal)', normal: '15 - 25 mm' },
      { structure: 'Trachea (sagittal)', normal: '13 - 22 mm' },
      { structure: 'Main Bronchi', normal: '< 15 mm' },
      { structure: 'Esophageal Wall', normal: '< 3 mm', notes: 'When distended' },
      { structure: 'Pericardium', normal: '< 2 mm' },
      { structure: 'LV Wall (diastole)', normal: '6 - 11 mm' },
      { structure: 'RV Wall', normal: '< 5 mm' },
      { structure: 'LA (AP)', normal: '< 4.0 cm' },
    ]
  },
  {
    id: 'neuro',
    name: 'Neuroimaging',
    icon: <Brain size={18} />,
    items: [
      { structure: 'Optic Nerve Sheath', normal: '< 5.5 mm', notes: '3mm behind globe' },
      { structure: 'Pituitary Height', normal: '< 9 mm', notes: 'May be larger in pregnancy/puberty' },
      { structure: 'Third Ventricle', normal: '< 7 mm' },
      { structure: 'Lateral Ventricle (frontal horn)', normal: '< 18 mm' },
      { structure: 'Fourth Ventricle', normal: '< 12 mm (AP)' },
      { structure: 'Internal Auditory Canal', normal: '< 8 mm' },
      { structure: 'Cavernous ICA', normal: '3 - 7 mm' },
    ]
  },
  {
    id: 'msk',
    name: 'Musculoskeletal',
    icon: <Bone size={18} />,
    items: [
      { structure: 'Achilles Tendon', normal: '< 6 mm (AP)', notes: 'Thickest 2-6cm above insertion' },
      { structure: 'Supraspinatus Tendon', normal: '< 8 mm' },
      { structure: 'ACL', normal: '7 - 12 mm' },
      { structure: 'Articular Cartilage (knee)', normal: '2 - 4 mm' },
      { structure: 'Intervertebral Disc (lumbar)', normal: '10 - 15 mm (AP)' },
    ]
  },
]

const PROTOCOLS = [
  {
    category: 'CT Abdomen/Pelvis',
    protocols: [
      { name: 'Routine with Contrast', phases: 'Portal venous (70s)', notes: 'Standard for most indications' },
      { name: 'Renal Mass', phases: 'Non-con, Corticomedullary (30s), Nephrographic (90s), ±Excretory (5min)', notes: '> 20 HU enhancement = solid' },
      { name: 'Liver Mass (LI-RADS)', phases: 'Non-con, Arterial (25-30s), Portal venous (70s), Delayed (3-5min)', notes: 'For HCC surveillance in cirrhosis' },
      { name: 'Pancreatic Mass', phases: 'Non-con, Pancreatic (40s), Portal venous (70s)', notes: 'Thin slices through pancreas' },
      { name: 'CT Urogram', phases: 'Non-con, Nephrographic (100s), Excretory (10-15min)', notes: 'For hematuria, urothelial eval' },
      { name: 'CTA Aorta', phases: 'Non-con (for IMH), Arterial (bolus tracking)', notes: 'ECG-gating for root' },
    ]
  },
  {
    category: 'CT Chest',
    protocols: [
      { name: 'Routine with Contrast', phases: 'Portal venous timing', notes: 'Standard chest CT' },
      { name: 'PE Protocol', phases: 'CTA timing (bolus track in PA)', notes: '100-150 HU threshold in PA' },
      { name: 'HRCT (ILD)', phases: 'Non-contrast, inspiration + expiration', notes: 'Thin slices (1-1.25mm), prone if posterior dependent opacity' },
      { name: 'Lung Cancer Screening', phases: 'Low-dose, non-contrast', notes: 'LDCT per NLST criteria' },
    ]
  },
  {
    category: 'MRI Abdomen',
    protocols: [
      { name: 'Liver (LI-RADS)', phases: 'T2, T1 in/out, DWI, Dynamic post-Gd (art, PV, delayed, HBP if using Eovist)', notes: 'HBP at 20min for Eovist' },
      { name: 'MRCP', phases: 'Heavily T2-weighted, 2D/3D sequences', notes: 'No contrast needed' },
      { name: 'Rectal Cancer', phases: 'High-res T2, DWI, ±contrast', notes: 'For staging, CRM assessment' },
      { name: 'Prostate (PI-RADS)', phases: 'T2, DWI (high b-value), DCE', notes: 'Endorectal coil optional at 3T' },
    ]
  },
]

const EMERGENCY_PROTOCOLS = [
  {
    title: 'Contrast Reaction - Mild',
    symptoms: 'Urticaria, pruritis, nausea, mild vomiting',
    actions: [
      'Monitor vitals',
      'Diphenhydramine 25-50mg IV/IM/PO',
      'Usually self-limiting',
      'Observe 30 minutes',
    ]
  },
  {
    title: 'Contrast Reaction - Moderate',
    symptoms: 'Diffuse urticaria, bronchospasm (mild), facial edema, tachycardia',
    actions: [
      'Call for assistance',
      'Diphenhydramine 50mg IV',
      'Bronchospasm: Albuterol 2-3 puffs',
      'Epinephrine 0.3mg IM if progressing',
      'IV fluids',
      'Monitor closely',
    ]
  },
  {
    title: 'Contrast Reaction - Severe (Anaphylaxis)',
    symptoms: 'Severe bronchospasm, laryngeal edema, hypotension, cardiac arrest',
    actions: [
      'Call code / activate emergency response',
      'Epinephrine 0.3mg IM (anterolateral thigh) - FIRST LINE',
      'May repeat q5-15 min',
      'IV fluids wide open',
      'Oxygen 6-10 L/min',
      'Elevate legs if hypotensive',
      'Prepare for intubation if needed',
      'Diphenhydramine 50mg IV, Methylprednisolone 125mg IV (adjuncts)',
    ]
  },
  {
    title: 'Vagal Reaction',
    symptoms: 'Bradycardia, hypotension, diaphoresis, pallor',
    actions: [
      'Elevate legs',
      'IV fluids',
      'Atropine 0.5-1mg IV if persistent bradycardia',
      'Monitor until resolved',
    ]
  },
  {
    title: 'Extravasation',
    symptoms: 'Pain, swelling at injection site',
    actions: [
      'Stop injection immediately',
      'Elevate affected extremity',
      'Ice packs intermittently',
      'Plastic surgery consult if > 100mL ionic or > 150mL non-ionic',
      'Document volume extravasated',
    ]
  },
]

const EXTERNAL_RESOURCES = [
  { name: 'Radiopaedia', url: 'https://radiopaedia.org', description: 'Radiology reference and cases' },
  { name: 'StatDx', url: 'https://www.statdx.com', description: 'Differential diagnosis database' },
  { name: 'ACR Appropriateness Criteria', url: 'https://www.acr.org/Clinical-Resources/ACR-Appropriateness-Criteria', description: 'Imaging guidelines' },
  { name: 'LI-RADS', url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS', description: 'Liver imaging reporting' },
  { name: 'Fleischner Society', url: 'https://fleischner.memberclicks.net', description: 'Pulmonary nodule guidelines' },
  { name: 'BI-RADS', url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads', description: 'Breast imaging reporting' },
  { name: 'PI-RADS', url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/PI-RADS', description: 'Prostate imaging reporting' },
  { name: 'TI-RADS', url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/TI-RADS', description: 'Thyroid imaging reporting' },
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
