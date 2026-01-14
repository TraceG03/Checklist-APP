'use client'

import { useState, useRef } from 'react'
import { processVoiceMemo } from '@/app/actions/voice'
import { Mic, Square, Loader2, CheckCircle, AlertCircle, Briefcase, User } from 'lucide-react'

export function VoiceRecorder({ date }: { date: string }) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [taskCategory, setTaskCategory] = useState<'personal' | 'work'>('personal')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        
        // Stop tracks to release mic
        stream.getTracks().forEach(track => track.stop())
        
        handleUpload(file)
      }

      mediaRecorderRef.current.start()
      setStatus('recording')
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setErrorMessage('Could not access microphone.')
      setStatus('error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop()
      // Status update happens in onstop
    }
  }

  const handleUpload = async (file: File) => {
    setStatus('processing')
    setErrorMessage('')
    
    const formData = new FormData()
    formData.append('audio', file)

    try {
      const res = await processVoiceMemo(formData, date, taskCategory)
      if (!res.ok) {
        setErrorMessage(res.error)
        setStatus('error')
        return
      }

      setStatus('success')
      // Reset to idle after a few seconds
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      console.error('Processing error:', err)
      setErrorMessage(err.message || 'Failed to process voice memo.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTaskCategory('personal')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
            taskCategory === 'personal'
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
          disabled={status !== 'idle'}
          title="Personal tasks"
        >
          <User className="w-4 h-4" />
          Personal
        </button>
        <button
          type="button"
          onClick={() => setTaskCategory('work')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
            taskCategory === 'work'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
          disabled={status !== 'idle'}
          title="Work tasks"
        >
          <Briefcase className="w-4 h-4" />
          Work
        </button>
      </div>
      {status === 'idle' && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-fit"
        >
          <Mic className="w-4 h-4" />
          Start Recording
        </button>
      )}

      {status === 'recording' && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-red-600 animate-pulse">
            <div className="w-3 h-3 bg-red-600 rounded-full" />
            Recording...
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 border border-red-200"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop
          </button>
        </div>
      )}

      {status === 'processing' && (
        <div className="flex items-center gap-2 text-indigo-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Transcribing & Extracting tasks...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span>Tasks extracted successfully!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="text-sm text-gray-500 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
