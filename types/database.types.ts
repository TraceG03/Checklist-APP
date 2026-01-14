export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string | null
          due_date: string | null
          completed: boolean
          source: 'manual' | 'ai' | 'voice'
          task_category: 'personal' | 'work'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          notes?: string | null
          due_date?: string | null
          completed?: boolean
          source?: 'manual' | 'ai' | 'voice'
          task_category?: 'personal' | 'work'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          notes?: string | null
          due_date?: string | null
          completed?: boolean
          source?: 'manual' | 'ai' | 'voice'
          task_category?: 'personal' | 'work'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          task_category: 'personal' | 'work'
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
          task_category?: 'personal' | 'work'
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
          task_category?: 'personal' | 'work'
          error?: string | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          id: string
          user_id: string
          title: string
          inspection_date: string
          status: 'draft' | 'completed'
          report_summary: string | null
          closeout_qna: Json | null
          closeout_generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          inspection_date?: string
          status?: 'draft' | 'completed'
          report_summary?: string | null
          closeout_qna?: Json | null
          closeout_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          inspection_date?: string
          status?: 'draft' | 'completed'
          report_summary?: string | null
          closeout_qna?: Json | null
          closeout_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_findings: {
        Row: {
          id: string
          inspection_id: string
          user_id: string
          photo_path: string | null
          voice_memo_path: string | null
          transcript: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          user_id?: string
          photo_path?: string | null
          voice_memo_path?: string | null
          transcript?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inspection_id?: string
          user_id?: string
          photo_path?: string | null
          voice_memo_path?: string | null
          transcript?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
