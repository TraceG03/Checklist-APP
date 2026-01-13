import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Dashboard } from '@/components/Dashboard'
import { format } from 'date-fns'

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

  const date = params.date || format(new Date(), 'yyyy-MM-dd')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('due_date', date)
    .order('created_at', { ascending: true })

  return <Dashboard user={user} tasks={tasks || []} date={date} />
}
