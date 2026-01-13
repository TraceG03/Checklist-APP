'use client'

import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addTask, toggleTask, deleteTask, signOut } from '@/app/actions/tasks'
import { Check, Trash2, Plus, LogOut, Mic, Calendar, ListTodo, FileAudio } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'

type Task = Database['public']['Tables']['tasks']['Row']
type VoiceMemo = Database['public']['Tables']['voice_memos']['Row']

export function Dashboard({
  user,
  tasks,
  voiceMemos,
  date,
}: {
  user: User
  tasks: Task[]
  voiceMemos: VoiceMemo[]
  date: string
}) {
  const router = useRouter()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [activeTab, setActiveTab] = useState<'tasks' | 'voice'>('tasks')

  const currentDate = parseISO(date)

  const handlePrevDay = () => {
    const newDate = subDays(currentDate, 1)
    router.push(`/?date=${format(newDate, 'yyyy-MM-dd')}`)
  }

  const handleNextDay = () => {
    const newDate = addDays(currentDate, 1)
    router.push(`/?date=${format(newDate, 'yyyy-MM-dd')}`)
  }

  const handleToday = () => {
    router.push(`/?date=${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    await addTask({
      title: newTaskTitle,
      due_date: date,
      source: 'manual',
    })
    setNewTaskTitle('')
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

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'EEEE, MMM d')}
            </span>
            <button
              onClick={handleToday}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Go to Today
            </button>
          </div>
          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            →
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
              <ListTodo className="w-4 h-4" />
              Tasks
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
              Voice Memos
              <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {voiceMemos.length}
              </span>
            </button>
          </div>

          {/* Tasks Tab Content */}
          {activeTab === 'tasks' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Tasks for {format(currentDate, 'MMM d')}
                </h2>
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {tasks.filter((t) => t.completed).length} / {tasks.length} done
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No tasks yet for this day.</p>
                    <p className="text-sm mt-1">Add one below or record a voice memo!</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group flex items-center p-4 hover:bg-gray-50 transition-colors ${
                        task.completed ? 'bg-gray-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id, !task.completed)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 hover:border-indigo-500'
                        }`}
                      >
                        {task.completed && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate transition-all ${
                            task.completed
                              ? 'text-gray-400 line-through'
                              : 'text-gray-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {task.notes}
                          </p>
                        )}
                        {task.source !== 'manual' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                            {task.source === 'ai' ? '🤖 AI extracted' : task.source}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Task Input */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
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
                <VoiceRecorder date={date} />
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
                    <div key={memo.id} className="p-4 hover:bg-gray-50">
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
