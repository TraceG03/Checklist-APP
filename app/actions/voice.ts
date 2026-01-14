'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function processVoiceMemo(
  formData: FormData,
  date: string,
  taskCategory: 'personal' | 'work' = 'personal'
): Promise<ActionResult<{ count: number }>> {
  const file = formData.get('audio') as File
  if (!file) {
    return { ok: false, error: 'No audio file provided' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Unauthorized' }
  }

  // 1. Upload to Supabase Storage
  const filename = `${user.id}/${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from('voice-memos')
    .upload(filename, file)

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` }
  }

  // 2. Create voice_memos record
  const { data: memoData, error: dbError } = await supabase
    .from('voice_memos')
    .insert({
      audio_path: filename,
      user_id: user.id,
      transcript_status: 'pending',
      extract_status: 'pending',
      task_category: taskCategory,
    })
    .select()
    .single()

  if (dbError) {
    return { ok: false, error: `DB insert failed: ${dbError.message}` }
  }

  try {
    // 3. Transcribe with OpenAI Whisper
    // We need a File object for OpenAI. The FormData file works.
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    })

    const transcriptText = transcription.text

    // Update transcript in DB
    await supabase
      .from('voice_memos')
      .update({
        transcript: transcriptText,
        transcript_status: 'done',
      })
      .eq('id', memoData.id)

    // 4. Extract Tasks with OpenAI GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo if preferred for cost
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that extracts tasks from voice notes.
          The user is managing a daily checklist for ${date}.
          Extract clear, actionable tasks.
          Return a JSON object with a key "tasks" which is an array of objects.
          Each object should have:
          - "title" (string, required, concise task name)
          - "notes" (string, optional, extra details)
          - "due_date" (string, YYYY-MM-DD, default to ${date} unless user explicitly mentions another date)

          If no tasks are found, return empty array.
          Do not include conversational filler.`
        },
        {
          role: 'user',
          content: transcriptText
        }
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    const tasks = result.tasks || []

    // 5. Insert Tasks
    if (tasks.length > 0) {
      const tasksToInsert = tasks.map((t: any) => ({
        user_id: user.id,
        title: t.title,
        notes: t.notes || null,
        due_date: t.due_date || date,
        source: 'ai',
        task_category: taskCategory,
        completed: false,
      }))

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)

      if (insertError) {
        throw new Error(`Task insert failed: ${insertError.message}`)
      }
    }

    // Update extract status
    await supabase
      .from('voice_memos')
      .update({
        extract_status: 'done',
        extracted_task_count: tasks.length,
      })
      .eq('id', memoData.id)

    revalidatePath('/')
    return { ok: true, data: { count: tasks.length } }

  } catch (err: any) {
    // Log error to DB
    await supabase
      .from('voice_memos')
      .update({
        error: err.message,
        transcript_status: 'error', // or extract_status depending on where it failed, simplifying here
      })
      .eq('id', memoData.id)

    return { ok: false, error: err?.message || 'Failed to process voice memo' }
  }
}

export async function deleteVoiceMemo(id: string): Promise<ActionResult<{}>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Unauthorized' }
  }

  // Get the memo to find the audio path
  const { data: memo } = await supabase
    .from('voice_memos')
    .select('audio_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (memo?.audio_path) {
    // Delete from storage
    await supabase.storage
      .from('voice-memos')
      .remove([memo.audio_path])
  }

  // Delete from database
  const { error } = await supabase
    .from('voice_memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  return { ok: true, data: {} }
}
