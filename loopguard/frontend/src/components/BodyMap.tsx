/**
 * Interactive Body Map
 * 
 * Visual representation of findings by anatomical region
 */

import { useState } from 'react'

interface Finding {
  id: string
  region: string
  description: string
  severity: 'low' | 'medium' | 'high'
  date: string
}

interface Props {
  findings?: Finding[]
  onRegionClick?: (region: string) => void
}

const MOCK_FINDINGS: Finding[] = [
  { id: '1', region: 'chest', description: 'Pulmonary nodule 8mm RLL', severity: 'high', date: '2024-01-15' },
  { id: '2', region: 'chest', description: 'Cardiomegaly, mild', severity: 'low', date: '2024-01-15' },
  { id: '3', region: 'abdomen', description: 'Liver cyst 2cm', severity: 'low', date: '2023-11-20' },
  { id: '4', region: 'abdomen', description: 'Adrenal nodule 1.5cm', severity: 'medium', date: '2023-11-20' },
  { id: '5', region: 'neck', description: 'Thyroid nodule TI-RADS 3', severity: 'medium', date: '2023-09-10' },
]

const REGIONS = {
  head: { cx: 100, cy: 35, label: 'Head/Brain' },
  neck: { cx: 100, cy: 70, label: 'Neck' },
  chest: { cx: 100, cy: 120, label: 'Chest' },
  abdomen: { cx: 100, cy: 180, label: 'Abdomen' },
  pelvis: { cx: 100, cy: 230, label: 'Pelvis' },
}

export default function BodyMap({ findings = MOCK_FINDINGS, onRegionClick }: Props) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const getRegionFindings = (region: string) => {
    return findings.filter(f => f.region === region)
  }

  const getRegionSeverity = (region: string) => {
    const regionFindings = getRegionFindings(region)
    if (regionFindings.some(f => f.severity === 'high')) return 'high'
    if (regionFindings.some(f => f.severity === 'medium')) return 'medium'
    if (regionFindings.length > 0) return 'low'
    return 'none'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#e2e8f0'
    }
  }

  const handleRegionClick = (region: string) => {
    setSelectedRegion(selectedRegion === region ? null : region)
    onRegionClick?.(region)
  }

  const selectedFindings = selectedRegion ? getRegionFindings(selectedRegion) : []

  return (
    <div className="flex gap-6">
      {/* Body SVG */}
      <div className="relative">
        <svg width="200" height="280" viewBox="0 0 200 280" className="drop-shadow-lg">
          {/* Body outline */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Head */}
          <ellipse cx="100" cy="35" rx="25" ry="30" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />
          
          {/* Neck */}
          <rect x="90" y="60" width="20" height="20" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />
          
          {/* Torso */}
          <path 
            d="M60 80 L140 80 L150 180 L130 220 L70 220 L50 180 Z" 
            fill="url(#bodyGradient)" 
            stroke="#cbd5e1" 
            strokeWidth="2"
          />
          
          {/* Arms */}
          <path d="M60 85 L30 150 L35 155 L65 95" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M140 85 L170 150 L165 155 L135 95" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />
          
          {/* Legs */}
          <path d="M70 220 L60 270 L80 270 L90 230" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M130 220 L140 270 L120 270 L110 230" fill="url(#bodyGradient)" stroke="#cbd5e1" strokeWidth="2" />

          {/* Interactive regions */}
          {Object.entries(REGIONS).map(([region, pos]) => {
            const severity = getRegionSeverity(region)
            const count = getRegionFindings(region).length
            const isHovered = hoveredRegion === region
            const isSelected = selectedRegion === region
            
            return (
              <g key={region}>
                {/* Clickable area */}
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={isHovered || isSelected ? 22 : 18}
                  fill={getSeverityColor(severity)}
                  fillOpacity={severity === 'none' ? 0.3 : 0.6}
                  stroke={isSelected ? '#1e40af' : isHovered ? '#3b82f6' : 'transparent'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="cursor-pointer transition-all duration-200"
                  filter={isHovered || isSelected ? 'url(#glow)' : undefined}
                  onMouseEnter={() => setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => handleRegionClick(region)}
                />
                
                {/* Count badge */}
                {count > 0 && (
                  <g>
                    <circle cx={pos.cx + 12} cy={pos.cy - 12} r="10" fill="#1e40af" />
                    <text 
                      x={pos.cx + 12} 
                      y={pos.cy - 8} 
                      textAnchor="middle" 
                      fill="white" 
                      fontSize="11" 
                      fontWeight="bold"
                    >
                      {count}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredRegion && !selectedRegion && (
          <div className="absolute left-[220px] top-1/2 -translate-y-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
            <p className="font-medium">{REGIONS[hoveredRegion as keyof typeof REGIONS].label}</p>
            <p className="text-slate-300">{getRegionFindings(hoveredRegion).length} findings</p>
          </div>
        )}
      </div>

      {/* Findings Panel */}
      <div className="flex-1 min-w-[250px]">
        {selectedRegion ? (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {REGIONS[selectedRegion as keyof typeof REGIONS].label}
              </h3>
              <span className="text-sm text-slate-500">{selectedFindings.length} findings</span>
            </div>
            <div className="divide-y divide-slate-100">
              {selectedFindings.length > 0 ? (
                selectedFindings.map(finding => (
                  <div key={finding.id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        finding.severity === 'high' ? 'bg-red-500' :
                        finding.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{finding.description}</p>
                        <p className="text-xs text-slate-500">{finding.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  No findings in this region
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-8 text-center">
            <p className="text-slate-600">Click a region to view findings</p>
            <p className="text-sm text-slate-400 mt-1">Colored dots indicate severity</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
