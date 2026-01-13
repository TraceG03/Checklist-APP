'use client'

import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { format, addWeeks, subWeeks, parseISO, addDays, isToday, isSameDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addTask, toggleTask, deleteTask, signOut } from '@/app/actions/tasks'
import { deleteVoiceMemo } from '@/app/actions/voice'
import { Check, Trash2, Plus, LogOut, Mic, ChevronLeft, ChevronRight, ListTodo, FileAudio, Calendar, ClipboardCheck } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'
import { InspectionTab } from './InspectionTab'

type Task = Database['public']['Tables']['tasks']['Row']
type VoiceMemo = Database['public']['Tables']['voice_memos']['Row']
type Inspection = Database['public']['Tables']['inspections']['Row']
type Finding = Database['public']['Tables']['inspection_findings']['Row']

interface InspectionWithFindings extends Inspection {
  inspection_findings: Finding[]
}

export function Dashboard({
  user,
  tasks,
  voiceMemos,
  inspections,
  weekStart,
  supabaseUrl,
}: {
  user: User
  tasks: Task[]
  voiceMemos: VoiceMemo[]
  inspections: InspectionWithFindings[]
  weekStart: string
  supabaseUrl: string
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'voice' | 'inspections'>('tasks')

  const getPhotoUrl = (path: string) => {
    return `${supabaseUrl}/storage/v1/object/public/inspection-photos/${path}`
  }
  const [expandedDay, setExpandedDay] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'))
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTaskForDay, setAddingTaskForDay] = useState<string | null>(null)

  const weekStartDate = parseISO(weekStart)
  const weekEndDate = addDays(weekStartDate, 6)

  // Generate array of 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = task.due_date
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const handlePrevWeek = () => {
    const newWeekStart = subWeeks(weekStartDate, 1)
    router.push(`/?date=${format(newWeekStart, 'yyyy-MM-dd')}`)
  }

  const handleNextWeek = () => {
    const newWeekStart = addWeeks(weekStartDate, 1)
    router.push(`/?date=${format(newWeekStart, 'yyyy-MM-dd')}`)
  }

  const handleThisWeek = () => {
    router.push(`/?date=${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const handleAddTask = async (e: React.FormEvent, date: string) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    await addTask({
      title: newTaskTitle,
      due_date: date,
      source: 'manual',
    })
    setNewTaskTitle('')
    setAddingTaskForDay(null)
  }

  const toggleDayExpanded = (dateStr: string) => {
    setExpandedDay(expandedDay === dateStr ? null : dateStr)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Check className="w-6 h-6 text-indigo-600" />
            Daily Check
          </h1>
          <button
            onClick={() => signOut()}
            className="text-gray-500 hover:text-gray-700"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-gray-900">
              {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d, yyyy')}
            </span>
            <button
              onClick={handleThisWeek}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1"
            >
              Go to This Week
            </button>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Weekly View
              <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {tasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'voice'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Mic className="w-4 h-4" />
              Voice
              <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {voiceMemos.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'inspections'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Inspections
              <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {inspections.length}
              </span>
            </button>
          </div>

          {/* Weekly Tasks Tab Content */}
          {activeTab === 'tasks' && (
            <div className="divide-y divide-gray-200">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayTasks = tasksByDate[dateStr] || []
                const isExpanded = expandedDay === dateStr
                const completedCount = dayTasks.filter(t => t.completed).length
                const today = isToday(day)

                return (
                  <div key={dateStr} className={`${today ? 'bg-indigo-50/50' : ''}`}>
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDayExpanded(dateStr)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                        today ? 'hover:bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          today 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${today ? 'text-indigo-600' : 'text-gray-900'}`}>
                              {format(day, 'EEEE')}
                            </span>
                            {today && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {format(day, 'MMMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {dayTasks.length > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            completedCount === dayTasks.length
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {completedCount}/{dayTasks.length}
                          </span>
                        )}
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </button>

                    {/* Expanded Day Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {/* Tasks List */}
                        <div className="ml-6 pl-6 border-l-2 border-gray-200 space-y-2">
                          {dayTasks.length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">No tasks for this day</p>
                          ) : (
                            dayTasks.map((task) => (
                              <div
                                key={task.id}
                                className={`group flex items-center gap-3 py-2 ${
                                  task.completed ? 'opacity-60' : ''
                                }`}
                              >
                                <button
                                  onClick={() => toggleTask(task.id, !task.completed)}
                                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    task.completed
                                      ? 'border-green-500 bg-green-500 text-white'
                                      : 'border-gray-300 hover:border-indigo-500'
                                  }`}
                                >
                                  {task.completed && <Check className="w-3 h-3" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${
                                    task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                                  }`}>
                                    {task.title}
                                  </p>
                                  {task.source !== 'manual' && (
                                    <span className="text-xs text-indigo-600">
                                      🤖 AI extracted
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          )}

                          {/* Add Task Form */}
                          {addingTaskForDay === dateStr ? (
                            <form onSubmit={(e) => handleAddTask(e, dateStr)} className="flex gap-2 pt-2">
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Task title..."
                                autoFocus
                                className="flex-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 border"
                              />
                              <button
                                type="submit"
                                disabled={!newTaskTitle.trim()}
                                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTaskForDay(null)
                                  setNewTaskTitle('')
                                }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setAddingTaskForDay(dateStr)}
                              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 pt-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add task
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Voice Memos Tab Content */}
          {activeTab === 'voice' && (
            <div>
              {/* Voice Recorder */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-indigo-500" />
                      Record Voice Memo
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Record a memo and AI will extract tasks automatically.
                    </p>
                  </div>
                </div>
                <VoiceRecorder date={format(new Date(), 'yyyy-MM-dd')} />
              </div>

              {/* Voice Memos List */}
              <div className="divide-y divide-gray-200">
                {voiceMemos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No voice memos yet.</p>
                    <p className="text-sm mt-1">Record your first memo above!</p>
                  </div>
                ) : (
                  voiceMemos.map((memo) => (
                    <div key={memo.id} className="group p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileAudio className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {format(new Date(memo.created_at), 'MMM d, h:mm a')}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                memo.transcript_status === 'done'
                                  ? 'bg-green-100 text-green-700'
                                  : memo.transcript_status === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {memo.transcript_status === 'done'
                                ? '✓ Transcribed'
                                : memo.transcript_status === 'error'
                                ? '✗ Error'
                                : '⏳ Processing'}
                            </span>
                          </div>
                          {memo.transcript && (
                            <p className="text-sm text-gray-600 bg-gray-100 rounded-md p-3 mt-2">
                              "{memo.transcript}"
                            </p>
                          )}
                          {memo.extracted_task_count > 0 && (
                            <p className="text-xs text-indigo-600 mt-2">
                              🤖 {memo.extracted_task_count} task{memo.extracted_task_count > 1 ? 's' : ''} extracted
                            </p>
                          )}
                          {memo.error && (
                            <p className="text-xs text-red-500 mt-2">
                              Error: {memo.error}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteVoiceMemo(memo.id)}
                          className="ml-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete voice memo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Inspections Tab Content */}
          {activeTab === 'inspections' && (
            <InspectionTab
              inspections={inspections}
              getPhotoUrl={getPhotoUrl}
            />
          )}
        </div>
      </main>
    </div>
  )
}
