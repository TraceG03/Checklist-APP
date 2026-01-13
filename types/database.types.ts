export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string | null
          due_date: string
          completed: boolean
          source: 'manual' | 'ai' | 'voice'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          notes?: string | null
          due_date?: string
          completed?: boolean
          source?: 'manual' | 'ai' | 'voice'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          notes?: string | null
          due_date?: string
          completed?: boolean
          source?: 'manual' | 'ai' | 'voice'
          created_at?: string
          updated_at?: string
        }
      }
      voice_memos: {
        Row: {
          id: string
          user_id: string
          created_at: string
          audio_path: string
          transcript: string | null
          transcript_status: 'pending' | 'done' | 'error'
          extract_status: 'pending' | 'done' | 'error'
          extracted_task_count: number
          error: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          created_at?: string
          audio_path: string
          transcript?: string | null
          transcript_status?: 'pending' | 'done' | 'error'
          extract_status?: 'pending' | 'done' | 'error'
          extracted_task_count?: number
          error?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          audio_path?: string
          transcript?: string | null
          transcript_status?: 'pending' | 'done' | 'error'
          extract_status?: 'pending' | 'done' | 'error'
          extracted_task_count?: number
          error?: string | null
        }
      }
    }
  }
}
