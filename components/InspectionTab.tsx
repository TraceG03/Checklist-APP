'use client'

import { useState, useRef } from 'react'
import { Database } from '@/types/database.types'
import { format } from 'date-fns'
import {
  createInspection,
  deleteInspection,
  addFindingWithPhoto,
  addFindingWithVoice,
  deleteFinding,
  finishInspection,
} from '@/app/actions/inspections'
import {
  Plus,
  Camera,
  Mic,
  Square,
  Trash2,
  FileText,
  ChevronRight,
  Loader2,
  Image,
  AudioLines,
  CheckCircle,
  Calendar,
} from 'lucide-react'

type Inspection = Database['public']['Tables']['inspections']['Row']
type Finding = Database['public']['Tables']['inspection_findings']['Row']

interface InspectionWithFindings extends Inspection {
  inspection_findings: Finding[]
}

export function InspectionTab({
  inspections,
  getPhotoUrl,
}: {
  inspections: InspectionWithFindings[]
  getPhotoUrl: (path: string) => string
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingForInspection, setRecordingForInspection] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [finishingInspection, setFinishingInspection] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New inspection form state
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsProcessing(true)
    try {
      await createInspection({
        title: newTitle,
        inspection_date: newDate,
      })
      setNewTitle('')
      setNewDate(format(new Date(), 'yyyy-MM-dd'))
      setShowNewForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoUpload = async (inspectionId: string, file: File) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      await addFindingWithPhoto(inspectionId, formData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = async (inspectionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())

        setIsProcessing(true)
        try {
          const formData = new FormData()
          formData.append('audio', file)
          await addFindingWithVoice(inspectionId, formData)
        } catch (err) {
          console.error(err)
        } finally {
          setIsProcessing(false)
          setIsRecording(false)
          setRecordingForInspection(null)
        }
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingForInspection(inspectionId)
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFinishInspection = async (inspectionId: string) => {
    setFinishingInspection(inspectionId)
    try {
      await finishInspection(inspectionId)
    } catch (err: any) {
      alert(err.message || 'Failed to finish inspection')
    } finally {
      setFinishingInspection(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Daily Inspections
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create daily inspection reports with photos and voice memos
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </button>
        </div>

        {/* New Inspection Form */}
        {showNewForm && (
          <form onSubmit={handleCreateInspection} className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspection Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., 123 Main St - Foundation Inspection"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm px-3 py-2 border"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm px-3 py-2 border"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isProcessing}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm"
                >
                  {isProcessing ? 'Creating...' : 'Create Inspection'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Inspections List */}
      <div className="divide-y divide-gray-200">
        {inspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No inspections yet.</p>
            <p className="text-sm mt-1">Create your first inspection above!</p>
          </div>
        ) : (
          inspections.map((inspection) => {
            const isExpanded = expandedInspection === inspection.id
            const findingsCount = inspection.inspection_findings?.length || 0

            return (
              <div key={inspection.id} className={inspection.status === 'completed' ? 'bg-green-50/30' : ''}>
                {/* Inspection Header */}
                <button
                  onClick={() => setExpandedInspection(isExpanded ? null : inspection.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{inspection.title}</span>
                        {inspection.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(inspection.inspection_date), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-13 pl-6 border-l-2 border-gray-200">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handlePhotoUpload(inspection.id, file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                      >
                        <Camera className="w-4 h-4" />
                        Add Photo/Video
                      </button>

                      {isRecording && recordingForInspection === inspection.id ? (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm animate-pulse"
                        >
                          <Square className="w-4 h-4 fill-current" />
                          Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={() => startRecording(inspection.id)}
                          disabled={isProcessing || isRecording}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm"
                        >
                          <Mic className="w-4 h-4" />
                          Record Finding
                        </button>
                      )}

                      {findingsCount > 0 && inspection.status !== 'completed' && (
                        <button
                          onClick={() => handleFinishInspection(inspection.id)}
                          disabled={finishingInspection === inspection.id}
                          className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm ml-auto"
                        >
                          {finishingInspection === inspection.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Finishing...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Finish Inspection
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => deleteInspection(inspection.id)}
                        className="p-2 text-gray-400 hover:text-red-500 ml-auto"
                        title="Delete inspection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Findings List */}
                    <div className="ml-13 pl-6 border-l-2 border-gray-200 space-y-3">
                      {inspection.inspection_findings?.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">
                          No findings yet. Add photos or record voice memos.
                        </p>
                      ) : (
                        inspection.inspection_findings?.map((finding, idx) => (
                          <div key={finding.id} className="group bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-gray-500">
                                    Finding {idx + 1}
                                  </span>
                                  {finding.photo_path && (
                                    <span className="flex items-center gap-1 text-xs text-blue-600">
                                      <Image className="w-3 h-3" />
                                      Photo
                                    </span>
                                  )}
                                  {finding.voice_memo_path && (
                                    <span className="flex items-center gap-1 text-xs text-purple-600">
                                      <AudioLines className="w-3 h-3" />
                                      Voice
                                    </span>
                                  )}
                                </div>

                                {finding.photo_path && (
                                  (() => {
                                    const url = getPhotoUrl(finding.photo_path)
                                    const lower = finding.photo_path.toLowerCase()
                                    const isVideo =
                                      lower.endsWith('.mp4') ||
                                      lower.endsWith('.mov') ||
                                      lower.endsWith('.webm') ||
                                      lower.endsWith('.m4v')

                                    return isVideo ? (
                                      <video
                                        src={url}
                                        controls
                                        className="w-full max-w-md rounded-md mb-2"
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Finding ${idx + 1}`}
                                        className="w-full max-w-md rounded-md mb-2"
                                      />
                                    )
                                  })()
                                )}

                                {finding.transcript && (
                                  <p className="text-sm text-gray-700 bg-white rounded p-2 border border-gray-200">
                                    "{finding.transcript}"
                                  </p>
                                )}

                                {finding.notes && (
                                  <p className="text-sm text-gray-600 mt-1">{finding.notes}</p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteFinding(finding.id)}
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Report Summary */}
                    {inspection.report_summary && (
                      <div className="ml-13 pl-6 border-l-2 border-green-300">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4" />
                            Generated Report
                          </h4>
                          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
                            {inspection.report_summary}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Closeout Q&A */}
                    {inspection.closeout_qna && (
                      <div className="ml-13 pl-6 border-l-2 border-indigo-300">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <h4 className="font-medium text-indigo-800 flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4" />
                            Daily Closeout
                          </h4>
                          <div className="space-y-3 text-sm text-gray-800">
                            <div>
                              <div className="font-semibold">Did HHR get done what we planned for?</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).hhr_done}</div>
                            </div>
                            <div>
                              <div className="font-semibold">Did Jaime get done what we planned for?</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).jaime_done}</div>
                            </div>
                            <div>
                              <div className="font-semibold">Did the other tasks/projects planned for today get accomplished?</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).other_tasks_done}</div>
                            </div>
                            <div>
                              <div className="font-semibold">If not, how is our timeline altered?</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).timeline_impact}</div>
                            </div>
                            <div>
                              <div className="font-semibold">What new tasks or information came up today that we need to plan for?</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).new_tasks_or_info}</div>
                            </div>
                            <div>
                              <div className="font-semibold">Add any photos or videos showing the progress made on all fronts.</div>
                              <div className="whitespace-pre-wrap">{(inspection.closeout_qna as any).media_summary}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}
