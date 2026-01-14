'use client'

import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { format, addWeeks, subWeeks, parseISO, addDays, isToday, isSameDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addTask, toggleTask, deleteTask, signOut, updateTask } from '@/app/actions/tasks'
import { deleteVoiceMemo } from '@/app/actions/voice'
import { Check, Trash2, Plus, LogOut, Mic, ChevronLeft, ChevronRight, ListTodo, FileAudio, Calendar, ClipboardCheck, Briefcase } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'work' | 'voice' | 'inspections'>('tasks')

  const getPhotoUrl = (path: string) => {
    return `${supabaseUrl}/storage/v1/object/public/inspection-photos/${path}`
  }
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTaskForDay, setAddingTaskForDay] = useState<string | null>(null)

  const weekStartDate = parseISO(weekStart)
  const weekEndDate = addDays(weekStartDate, 6)

  // Generate array of 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))

  const undatedTasks = tasks.filter((t) => !t.due_date)
  const datedTasks = tasks.filter((t) => !!t.due_date)

  const workTasks = tasks.filter((t) => t.task_category === 'work')
  const datedWorkTasks = workTasks.filter((t) => !!t.due_date)

  const workTasksByDate = datedWorkTasks.reduce((acc, task) => {
    const dateKey = task.due_date as string
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Group only dated tasks by date
  const tasksByDate = datedTasks.reduce((acc, task) => {
    const dateKey = task.due_date as string
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

  const handleAddTask = async (e: React.FormEvent, date: string | null) => {
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

  const handleAssignDate = async (taskId: string, dueDate: string | null) => {
    await updateTask(taskId, { due_date: dueDate })
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
              onClick={() => setActiveTab('work')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'work'
                  ? 'text-slate-800 border-b-2 border-slate-800 bg-slate-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Work Tasks
              <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {workTasks.length}
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

          {/* Weekly Tasks Tab Content - Document Style */}
          {activeTab === 'tasks' && (
            <div className="p-6 space-y-8">
              {/* All Tasks (single list). Only tasks with a date appear under days below. */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-600" />
                    All Tasks
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {tasks.length}
                  </span>
                </div>

                {/* Add undated task */}
                <form onSubmit={(e) => handleAddTask(e, null)} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task (no date)..."
                    className="flex-1 rounded border-gray-300 px-3 py-2 text-sm border focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="inline-flex items-center gap-2 rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </form>

                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-sm text-gray-500">No tasks yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {tasks.map((task) => (
                        <li key={task.id} className="group">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleTask(task.id, !task.completed)}
                              className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                task.completed
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-gray-400 hover:border-indigo-500'
                              }`}
                              title="Toggle complete"
                            >
                              {task.completed && <Check className="w-3 h-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 select-none">•</span>
                                <span
                                  className={`text-sm ${
                                    task.completed
                                      ? 'text-gray-400 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.source !== 'manual' && (
                                  <span className="text-xs text-indigo-500">(AI)</span>
                                )}
                              </div>
                              {task.notes && (
                                <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                  {task.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={task.due_date || ''}
                                onChange={(e) =>
                                  handleAssignDate(
                                    task.id,
                                    e.target.value ? e.target.value : null
                                  )
                                }
                                className="text-xs rounded border-gray-300 border px-2 py-1 bg-white"
                                title="Assign to a day (optional)"
                              />
                              {task.due_date && (
                                <button
                                  onClick={() => handleAssignDate(task.id, null)}
                                  className="text-xs text-gray-400 hover:text-gray-700"
                                  title="Remove date"
                                >
                                  Clear
                                </button>
                              )}
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Weekly Document View (dated tasks only) */}
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayTasks = tasksByDate[dateStr] || []
                const today = isToday(day)

                return (
                  <div key={dateStr} className="space-y-2">
                    {/* Day Header - Document Style */}
                    <div className={`flex items-center justify-between border-b-2 pb-2 ${
                      today ? 'border-indigo-500' : 'border-gray-300'
                    }`}>
                      <h3 className={`text-lg font-bold ${today ? 'text-indigo-600' : 'text-gray-800'}`}>
                        {format(day, 'EEEE, MMMM d')}
                        {today && (
                          <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-normal">
                            Today
                          </span>
                        )}
                      </h3>
                    </div>

                    {/* Tasks - Bullet Point Style */}
                    <div className="pl-4">
                      {dayTasks.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No tasks scheduled</p>
                      ) : (
                        <ul className="space-y-1">
                          {dayTasks.map((task) => (
                            <li
                              key={task.id}
                              className="group flex items-start gap-3"
                            >
                              <button
                                onClick={() => toggleTask(task.id, !task.completed)}
                                className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  task.completed
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-400 hover:border-indigo-500'
                                }`}
                              >
                                {task.completed && <Check className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${
                                  task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </span>
                                {task.source !== 'manual' && (
                                  <span className="ml-2 text-xs text-indigo-500">
                                    (AI)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add Task */}
                      {addingTaskForDay === dateStr ? (
                        <form onSubmit={(e) => handleAddTask(e, dateStr)} className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="New task..."
                            autoFocus
                            className="flex-1 text-sm rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 border"
                          />
                          <button
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingTaskForDay(null)
                              setNewTaskTitle('')
                            }}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddingTaskForDay(dateStr)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-2"
                        >
                          <Plus className="w-3 h-3" />
                          Add task
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Work Tasks Tab Content (filtered) */}
          {activeTab === 'work' && (
            <div className="p-6 space-y-8">
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-800" />
                    Work Tasks
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {workTasks.length}
                  </span>
                </div>

                {/* Add undated work task */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!newTaskTitle.trim()) return
                    await addTask({
                      title: newTaskTitle,
                      due_date: null,
                      source: 'manual',
                      task_category: 'work',
                    })
                    setNewTaskTitle('')
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a work task (no date)..."
                    className="flex-1 rounded border-gray-300 px-3 py-2 text-sm border focus:border-slate-500 focus:ring-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </form>

                <div className="space-y-2">
                  {workTasks.length === 0 ? (
                    <div className="text-sm text-gray-500">No work tasks yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {workTasks.map((task) => (
                        <li key={task.id} className="group">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleTask(task.id, !task.completed)}
                              className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                task.completed
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-gray-400 hover:border-slate-600'
                              }`}
                              title="Toggle complete"
                            >
                              {task.completed && <Check className="w-3 h-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 select-none">•</span>
                                <span
                                  className={`text-sm ${
                                    task.completed
                                      ? 'text-gray-400 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.source !== 'manual' && (
                                  <span className="text-xs text-slate-700">(AI)</span>
                                )}
                              </div>
                              {task.notes && (
                                <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                  {task.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={task.due_date || ''}
                                onChange={(e) =>
                                  handleAssignDate(
                                    task.id,
                                    e.target.value ? e.target.value : null
                                  )
                                }
                                className="text-xs rounded border-gray-300 border px-2 py-1 bg-white"
                                title="Assign to a day (optional)"
                              />
                              {task.due_date && (
                                <button
                                  onClick={() => handleAssignDate(task.id, null)}
                                  className="text-xs text-gray-400 hover:text-gray-700"
                                  title="Remove date"
                                >
                                  Clear
                                </button>
                              )}
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Weekly Document View (work tasks with a date only) */}
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayTasks = workTasksByDate[dateStr] || []
                const today = isToday(day)

                return (
                  <div key={dateStr} className="space-y-2">
                    <div
                      className={`flex items-center justify-between border-b-2 pb-2 ${
                        today ? 'border-slate-800' : 'border-gray-300'
                      }`}
                    >
                      <h3
                        className={`text-lg font-bold ${
                          today ? 'text-slate-900' : 'text-gray-800'
                        }`}
                      >
                        {format(day, 'EEEE, MMMM d')}
                        {today && (
                          <span className="ml-2 text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full font-normal">
                            Today
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="pl-4">
                      {dayTasks.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No work tasks scheduled</p>
                      ) : (
                        <ul className="space-y-1">
                          {dayTasks.map((task) => (
                            <li key={task.id} className="group flex items-start gap-3">
                              <button
                                onClick={() => toggleTask(task.id, !task.completed)}
                                className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  task.completed
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-400 hover:border-slate-600'
                                }`}
                              >
                                {task.completed && <Check className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-sm ${
                                    task.completed
                                      ? 'text-gray-400 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.source !== 'manual' && (
                                  <span className="ml-2 text-xs text-slate-700">(AI)</span>
                                )}
                              </div>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
                          onClick={async () => {
                            const res = await deleteVoiceMemo(memo.id)
                            if (!res.ok) {
                              alert(res.error)
                            }
                          }}
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
