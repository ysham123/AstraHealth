/**
 * Command Palette (Cmd+K)
 * 
 * Natural language search and quick actions
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, BarChart3, Home, Zap, X } from 'lucide-react'

interface CommandResult {
  id: string
  type: 'page' | 'patient' | 'action' | 'insight'
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
}

// Mock patient data for search
const MOCK_PATIENTS = [
  { id: '1', name: 'Smith, John', mrn: 'MRN-12345', finding: 'Lung nodule 8mm', status: 'overdue' },
  { id: '2', name: 'Davis, Angela', mrn: 'MRN-23456', finding: 'Brain lesion', status: 'pending' },
  { id: '3', name: 'Wilson, Thomas', mrn: 'MRN-34567', finding: 'Liver cyst', status: 'completed' },
  { id: '4', name: 'Lee, Michelle', mrn: 'MRN-45678', finding: 'Thyroid nodule', status: 'pending' },
  { id: '5', name: 'Garcia, Roberto', mrn: 'MRN-56789', finding: 'Pulmonary nodule 6mm', status: 'overdue' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      // Default results
      setResults([
        { id: 'nav-home', type: 'page', title: 'Dashboard', icon: <Home size={16} />, action: () => { navigate('/'); onClose() } },
        { id: 'nav-reading', type: 'page', title: 'Reading Room', icon: <FileText size={16} />, action: () => { navigate('/reading'); onClose() } },
        { id: 'nav-metrics', type: 'page', title: 'Metrics', icon: <BarChart3 size={16} />, action: () => { navigate('/metrics'); onClose() } },
      ])
      return
    }

    const q = query.toLowerCase()
    const newResults: CommandResult[] = []

    // Natural language parsing
    if (q.includes('overdue') || q.includes('late')) {
      const overdue = MOCK_PATIENTS.filter(p => p.status === 'overdue')
      overdue.forEach(p => {
        newResults.push({
          id: `patient-${p.id}`,
          type: 'patient',
          title: p.name,
          subtitle: `${p.finding} - OVERDUE`,
          icon: <Zap size={16} className="text-red-500" />,
          action: () => { navigate('/reading'); onClose() }
        })
      })
      if (overdue.length > 0) {
        newResults.unshift({
          id: 'insight-overdue',
          type: 'insight',
          title: `${overdue.length} overdue follow-ups found`,
          subtitle: 'Click to view all',
          icon: <Zap size={16} className="text-amber-500" />,
          action: () => { navigate('/reading'); onClose() }
        })
      }
    }

    if (q.includes('lung') || q.includes('nodule') || q.includes('chest')) {
      const lungPatients = MOCK_PATIENTS.filter(p => 
        p.finding.toLowerCase().includes('lung') || 
        p.finding.toLowerCase().includes('nodule') ||
        p.finding.toLowerCase().includes('pulmonary')
      )
      lungPatients.forEach(p => {
        newResults.push({
          id: `patient-${p.id}`,
          type: 'patient',
          title: p.name,
          subtitle: p.finding,
          icon: <FileText size={16} className="text-blue-500" />,
          action: () => { navigate('/reading'); onClose() }
        })
      })
    }

    // Patient name search
    MOCK_PATIENTS.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)) {
        if (!newResults.find(r => r.id === `patient-${p.id}`)) {
          newResults.push({
            id: `patient-${p.id}`,
            type: 'patient',
            title: p.name,
            subtitle: `${p.mrn} - ${p.finding}`,
            icon: <FileText size={16} className="text-slate-400" />,
            action: () => { navigate('/reading'); onClose() }
          })
        }
      }
    })

    // Page search
    if ('dashboard'.includes(q) || 'home'.includes(q)) {
      newResults.push({ id: 'nav-home', type: 'page', title: 'Dashboard', icon: <Home size={16} />, action: () => { navigate('/'); onClose() } })
    }
    if ('reading'.includes(q) || 'studies'.includes(q)) {
      newResults.push({ id: 'nav-reading', type: 'page', title: 'Reading Room', icon: <FileText size={16} />, action: () => { navigate('/reading'); onClose() } })
    }
    if ('metrics'.includes(q) || 'stats'.includes(q) || 'analytics'.includes(q)) {
      newResults.push({ id: 'nav-metrics', type: 'page', title: 'Metrics', icon: <BarChart3 size={16} />, action: () => { navigate('/metrics'); onClose() } })
    }

    setResults(newResults.slice(0, 8))
    setSelectedIndex(0)
  }, [query, navigate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      results[selectedIndex].action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
          <Search size={20} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search patients, commands, or try 'show overdue nodules'..."
            className="flex-1 text-lg outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-auto py-2">
          {results.length > 0 ? (
            results.map((result, idx) => (
              <button
                key={result.id}
                onClick={result.action}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  result.type === 'insight' ? 'bg-amber-100' :
                  result.type === 'patient' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-sm text-slate-500 truncate">{result.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 uppercase">
                  {result.type}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              <p>No results found</p>
              <p className="text-sm mt-1">Try "overdue", "lung nodule", or a patient name</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded">↵</kbd> Select</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
