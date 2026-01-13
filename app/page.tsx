import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Dashboard } from '@/components/Dashboard'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Use the date param or default to today
  const selectedDate = params.date ? parseISO(params.date) : new Date()
  
  // Get the week boundaries (Monday to Sunday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  // Fetch tasks for the entire week
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_date', format(weekStart, 'yyyy-MM-dd'))
    .lte('due_date', format(weekEnd, 'yyyy-MM-dd'))
    .order('created_at', { ascending: true })

  // Fetch voice memos (all, ordered by newest first)
  const { data: voiceMemos } = await supabase
    .from('voice_memos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <Dashboard
      user={user}
      tasks={tasks || []}
      voiceMemos={voiceMemos || []}
      weekStart={format(weekStart, 'yyyy-MM-dd')}
    />
  )
}
