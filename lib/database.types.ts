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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_profiles: {
        Row: {
          id: string
          user_id: string
          occupation: string | null
          annual_income: number | null
          savings_goal_yearly: number | null
          financial_goals: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          occupation?: string | null
          annual_income?: number | null
          savings_goal_yearly?: number | null
          financial_goals?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          occupation?: string | null
          annual_income?: number | null
          savings_goal_yearly?: number | null
          financial_goals?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          monthly_limit: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          monthly_limit: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          monthly_limit?: number
          updated_at?: string | null
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

// Type aliases for convenience
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type AIChatSession = Database['public']['Tables']['ai_chat_sessions']['Row']
export type AIChatSessionInsert = Database['public']['Tables']['ai_chat_sessions']['Insert']
export type AIChatSessionUpdate = Database['public']['Tables']['ai_chat_sessions']['Update']

export type AIChatMessage = Database['public']['Tables']['ai_chat_messages']['Row']
export type AIChatMessageInsert = Database['public']['Tables']['ai_chat_messages']['Insert']
export type AIChatMessageUpdate = Database['public']['Tables']['ai_chat_messages']['Update']

export type BudgetProfile = Database['public']['Tables']['budget_profiles']['Row']
export type BudgetProfileInsert = Database['public']['Tables']['budget_profiles']['Insert']
export type BudgetProfileUpdate = Database['public']['Tables']['budget_profiles']['Update']

export type CategoryBudget = Database['public']['Tables']['category_budgets']['Row']
export type CategoryBudgetInsert = Database['public']['Tables']['category_budgets']['Insert']
export type CategoryBudgetUpdate = Database['public']['Tables']['category_budgets']['Update']

// User Subscriptions
export interface UserSubscription {
  id: string
  user_id: string
  merchant_name: string
  display_name: string | null
  category: string | null
  amount: number
  billing_period: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  next_charge_date: string | null
  source: 'manual' | 'detected'
  detected_subscription_id: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface UserSubscriptionInsert {
  id?: string
  user_id: string
  merchant_name: string
  display_name?: string | null
  category?: string | null
  amount: number
  billing_period: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  next_charge_date?: string | null
  source: 'manual' | 'detected'
  detected_subscription_id?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface UserSubscriptionUpdate {
  merchant_name?: string
  display_name?: string | null
  category?: string | null
  amount?: number
  billing_period?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  next_charge_date?: string | null
  is_active?: boolean
  updated_at?: string | null
}

// Dismissed Subscriptions
export interface DismissedSubscription {
  id: string
  user_id: string
  detected_subscription_id: string
  dismissed_at: string | null
}

export interface DismissedSubscriptionInsert {
  id?: string
  user_id: string
  detected_subscription_id: string
  dismissed_at?: string | null
}

// Financial Goals
export interface FinancialGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  category: string | null
  color: string | null
  icon: string | null
  is_completed: boolean
  created_at: string | null
  updated_at: string | null
}

export interface FinancialGoalInsert {
  id?: string
  user_id: string
  name: string
  target_amount: number
  current_amount?: number
  deadline?: string | null
  category?: string | null
  color?: string | null
  icon?: string | null
  is_completed?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface FinancialGoalUpdate {
  name?: string
  target_amount?: number
  current_amount?: number
  deadline?: string | null
  category?: string | null
  color?: string | null
  icon?: string | null
  is_completed?: boolean
  updated_at?: string | null
}
