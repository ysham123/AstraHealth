/**
 * AI Scan Analysis Page
 * 
 * Real integration with Myndra multi-agent AI system
 * - Upload chest X-rays for analysis
 * - View AI predictions with confidence scores
 * - Display saliency heatmaps for interpretability
 * - Radiologist review and annotation
 * - Auto-generated follow-up recommendations
 */

import { useState, useCallback } from 'react'
import { api } from '../api/client'
import {
  Upload,
  Cpu,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Brain,
  Activity,
  FileImage,
  Wind,
  Stethoscope,
  RefreshCw,
  Calendar,
  AlertCircle,
} from 'lucide-react'

interface Finding {
  id: string
  condition: string
  probability: number
  diagnosis: string
  severity: 'normal' | 'mild' | 'moderate' | 'severe'
  location: string
  heatmap?: string
  processing_steps?: Array<{ name: string; info: Record<string, string> }>
  radiologist_approved?: boolean
  radiologist_note?: string
}

interface FollowUpSuggestion {
  condition: string
  recommendation: string
  urgency: string
  interval_months?: number
  rationale: string
}

interface ScanResult {
  case_id: string
  filename: string
  analysis_type: string
  analyzed_at: string
  findings: Finding[]
  followup_suggestions: FollowUpSuggestion[]
  status: string
}

type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export default function ScanAnalysisPage() {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [myndraStatus, setMyndraStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [activeStep, setActiveStep] = useState<string | null>(null)

  // Check Myndra connection status
  const checkMyndraHealth = useCallback(async () => {
    try {
      const response = await api.get<{ myndra_status: string }>('/scan/health')
      setMyndraStatus(response.myndra_status === 'connected' ? 'connected' : 'disconnected')
    } catch {
      setMyndraStatus('disconnected')
    }
  }, [])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
      setError(null)
      setStatus('idle')
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
      setError(null)
      setStatus('idle')
    }
  }, [])

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedFile) return

    setStatus('uploading')
    setError(null)
    setResult(null)

    try {
      setStatus('analyzing')
      
      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Start step animation alongside API call (non-blocking)
      const steps = ['Preprocessing', 'Feature Extraction', 'Classification', 'Post-processing']
      const animateSteps = async () => {
        for (const step of steps) {
          setActiveStep(step)
          await new Promise(r => setTimeout(r, 800))
        }
      }
      
      // Run API call and step animation concurrently
      const [response] = await Promise.all([
        api.upload<ScanResult>('/scan/analyze?analysis_type=pneumonia', formData),
        animateSteps()
      ])
      
      setActiveStep(null)
      setResult(response)
      setStatus('complete')
    } catch (err: any) {
      setActiveStep(null)
      setError(err.message || 'Analysis failed')
      setStatus('error')
    }
  }

  // Submit radiologist review
  const submitReview = async (findingId: string, approved: boolean, note?: string) => {
    if (!result) return

    try {
      await api.post('/scan/review', {
        case_id: result.case_id,
        finding_id: findingId,
        approved,
        radiologist_note: note,
      })

      // Update local state
      setResult(prev => {
        if (!prev) return prev
        return {
          ...prev,
          findings: prev.findings.map(f =>
            f.id === findingId
              ? { ...f, radiologist_approved: approved, radiologist_note: note }
              : f
          ),
        }
      })
    } catch (err: any) {
      console.error('Review failed:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'normal': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'mild': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'moderate': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-400'
      case 'routine': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl">
              <Brain className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Scan Analysis</h1>
              <p className="text-sm text-slate-400">Powered by Myndra Multi-Agent System</p>
            </div>
          </div>
          
          {/* Myndra Status */}
          <button 
            onClick={checkMyndraHealth}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              myndraStatus === 'connected' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : myndraStatus === 'disconnected'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-700 text-slate-400 border border-slate-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              myndraStatus === 'connected' ? 'bg-green-400' : 
              myndraStatus === 'disconnected' ? 'bg-red-400' : 'bg-slate-400'
            }`} />
            Myndra: {myndraStatus === 'unknown' ? 'Check Status' : myndraStatus}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          
          {/* Left Panel - Upload & Image */}
          <div className="col-span-2 space-y-4">
            {/* Upload Area */}
            {!selectedFile && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-600 p-12 text-center hover:border-violet-500/50 transition-colors"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload size={48} className="mx-auto text-slate-500 mb-4" />
                  <p className="text-lg font-medium text-slate-300 mb-2">
                    Drop chest X-ray here or click to upload
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports JPEG, PNG • Max 10MB
                  </p>
                </label>
              </div>
            )}

            {/* Image Viewer */}
            {selectedFile && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <FileImage size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                        setResult(null)
                      }}
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                    <button
                      onClick={runAnalysis}
                      disabled={status === 'analyzing' || status === 'uploading'}
                      className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === 'analyzing' || status === 'uploading' ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Run AI Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Image Display */}
                <div className="relative aspect-square bg-black flex items-center justify-center max-h-[500px]">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Chest X-ray"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                  
                  {/* Heatmap Overlay - Show if available */}
                  {result?.findings.some(f => f.heatmap) && (
                    <div className="absolute inset-0 pointer-events-none">
                      {result.findings.map(f => f.heatmap && (
                        <img
                          key={f.id}
                          src={`data:image/png;base64,${f.heatmap}`}
                          alt="Heatmap"
                          className="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-screen"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <div>
                  <p className="text-red-400 font-medium">Analysis Failed</p>
                  <p className="text-red-300/70 text-sm mt-1">{error}</p>
                  {error.includes('Myndra') && (
                    <p className="text-red-300/50 text-xs mt-2">
                      Make sure Myndra is running: cd Myndra && uvicorn backend.main:app --port 8001
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-4">
            {/* Agent Pipeline */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-violet-400" />
                AI Pipeline
              </h3>
              <div className="space-y-2">
                {['Preprocessing', 'Feature Extraction', 'Classification', 'Post-processing'].map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      activeStep === step
                        ? 'bg-violet-600/20 border border-violet-500/50'
                        : status === 'complete' || (activeStep && ['Preprocessing', 'Feature Extraction', 'Classification', 'Post-processing'].indexOf(activeStep) > i)
                          ? 'bg-green-600/10 border border-green-500/30'
                          : 'bg-slate-700/30 border border-slate-600/30'
                    }`}
                  >
                    {activeStep === step ? (
                      <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    ) : status === 'complete' || (activeStep && ['Preprocessing', 'Feature Extraction', 'Classification', 'Post-processing'].indexOf(activeStep) > i) ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-500" />
                    )}
                    <span className={`text-sm ${activeStep === step ? 'text-violet-300' : 'text-slate-400'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Findings */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Eye size={16} className="text-violet-400" />
                AI Findings
              </h3>

              {status === 'idle' && !result && (
                <p className="text-sm text-slate-500 text-center py-6">
                  Upload an image and run analysis
                </p>
              )}

              {(status === 'analyzing' || status === 'uploading') && (
                <div className="text-center py-6">
                  <Activity className="w-8 h-8 text-violet-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-slate-400">Processing image...</p>
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {result.findings.map(finding => (
                    <div
                      key={finding.id}
                      className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wind size={16} className="text-blue-400" />
                          <span className="font-medium text-white">{finding.condition}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(finding.severity)}`}>
                          {finding.diagnosis}
                        </span>
                      </div>

                      {/* Confidence Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Confidence</span>
                          <span className="text-violet-400 font-medium">
                            {(finding.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              finding.probability >= 0.7 ? 'bg-red-500' :
                              finding.probability >= 0.5 ? 'bg-orange-500' :
                              finding.probability >= 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${finding.probability * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Radiologist Review */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-600">
                        {finding.radiologist_approved === undefined ? (
                          <>
                            <span className="text-xs text-slate-500">Review:</span>
                            <button
                              onClick={() => submitReview(finding.id, true)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30"
                            >
                              <ThumbsUp size={12} /> Agree
                            </button>
                            <button
                              onClick={() => submitReview(finding.id, false, 'Needs correction')}
                              className="flex items-center gap-1 px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30"
                            >
                              <ThumbsDown size={12} /> Disagree
                            </button>
                          </>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs ${
                            finding.radiologist_approved ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {finding.radiologist_approved ? (
                              <><CheckCircle size={12} /> Approved</>
                            ) : (
                              <><XCircle size={12} /> Flagged for review</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-up Suggestions */}
            {result && result.followup_suggestions.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Stethoscope size={16} className="text-violet-400" />
                  Suggested Follow-ups
                </h3>
                <div className="space-y-2">
                  {result.followup_suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-white text-sm">{suggestion.condition}</span>
                        <span className={`text-xs ${getUrgencyColor(suggestion.urgency)}`}>
                          {suggestion.urgency === 'high' ? '⚡ High Priority' : '📋 Routine'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{suggestion.recommendation}</p>
                      {suggestion.interval_months && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={12} />
                          <span>In {suggestion.interval_months} month{suggestion.interval_months > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2 italic">{suggestion.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
