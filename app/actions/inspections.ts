'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create a new daily inspection
export async function createInspection(data: {
  title: string
  inspection_date: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: inspection, error } = await supabase
    .from('inspections')
    .insert({
      title: data.title,
      inspection_date: data.inspection_date,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return inspection
}

// Delete an inspection
export async function deleteInspection(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Get all findings to delete their files
  const { data: findings } = await supabase
    .from('inspection_findings')
    .select('photo_path, voice_memo_path')
    .eq('inspection_id', id)

  // Delete files from storage
  if (findings) {
    const photoPaths = findings.map(f => f.photo_path).filter(Boolean) as string[]
    const voicePaths = findings.map(f => f.voice_memo_path).filter(Boolean) as string[]

    if (photoPaths.length > 0) {
      await supabase.storage.from('inspection-photos').remove(photoPaths)
    }
    if (voicePaths.length > 0) {
      await supabase.storage.from('voice-memos').remove(voicePaths)
    }
  }

  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

// Add a finding with photo
export async function addFindingWithPhoto(
  inspectionId: string,
  formData: FormData,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const photo = formData.get('photo') as File | null
  let photoPath: string | null = null

  if (photo && photo.size > 0) {
    const filename = `${user.id}/${inspectionId}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await supabase.storage
      .from('inspection-photos')
      .upload(filename, photo)

    if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)
    photoPath = filename
  }

  const { error } = await supabase
    .from('inspection_findings')
    .insert({
      inspection_id: inspectionId,
      user_id: user.id,
      photo_path: photoPath,
      notes: notes || null,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

// Add a finding with voice memo
export async function addFindingWithVoice(
  inspectionId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const audio = formData.get('audio') as File
  if (!audio) throw new Error('No audio file provided')

  // Upload audio
  const filename = `${user.id}/${inspectionId}/${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from('voice-memos')
    .upload(filename, audio)

  if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`)

  // Create finding record
  const { data: finding, error: dbError } = await supabase
    .from('inspection_findings')
    .insert({
      inspection_id: inspectionId,
      user_id: user.id,
      voice_memo_path: filename,
    })
    .select()
    .single()

  if (dbError) throw new Error(dbError.message)

  // Transcribe with Whisper
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
    })

    await supabase
      .from('inspection_findings')
      .update({ transcript: transcription.text })
      .eq('id', finding.id)
  } catch (err: any) {
    console.error('Transcription failed:', err)
  }

  revalidatePath('/')
}

// Delete a finding
export async function deleteFinding(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Get the finding to delete files
  const { data: finding } = await supabase
    .from('inspection_findings')
    .select('photo_path, voice_memo_path')
    .eq('id', id)
    .single()

  if (finding?.photo_path) {
    await supabase.storage.from('inspection-photos').remove([finding.photo_path])
  }
  if (finding?.voice_memo_path) {
    await supabase.storage.from('voice-memos').remove([finding.voice_memo_path])
  }

  const { error } = await supabase
    .from('inspection_findings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

// Generate AI report
export async function generateInspectionReport(inspectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Get inspection details
  const { data: inspection } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', inspectionId)
    .single()

  if (!inspection) throw new Error('Inspection not found')

  // Get all findings
  const { data: findings } = await supabase
    .from('inspection_findings')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true })

  if (!findings || findings.length === 0) {
    throw new Error('No findings to generate report from')
  }

  // Build context for AI
  const findingsContext = findings.map((f, i) => {
    let context = `Finding ${i + 1}:`
    if (f.notes) context += `\n  Notes: ${f.notes}`
    if (f.transcript) context += `\n  Voice memo transcript: "${f.transcript}"`
    if (f.photo_path) context += `\n  [Photo attached]`
    return context
  }).join('\n\n')

  // Generate report with GPT
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional daily inspection report writer.
        
Generate a formal inspection report summary based on the findings provided.
The report should include:
1. Executive Summary (2-3 sentences overview)
2. Key Findings (bullet points of main issues/observations)
3. Recommendations (actionable items based on findings)

Keep the tone professional and concise. Focus on the facts from the transcripts and notes.`
      },
      {
        role: 'user',
        content: `Inspection: ${inspection.title}
Date: ${inspection.inspection_date}

Findings:
${findingsContext}`
      }
    ],
  })

  const reportSummary = completion.choices[0].message.content

  // Update inspection with report
  await supabase
    .from('inspections')
    .update({
      report_summary: reportSummary,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inspectionId)

  revalidatePath('/')
  return reportSummary
}
