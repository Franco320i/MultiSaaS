
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_kind": string,"actor_user_id": string | null,"changes": NonNullable<Json>,"created_at": string,"id": number,"ip": unknown,"reason": string | null,"target_id": string | null,"target_type": string | null,"tenant_id": string | null,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_kind": string,"actor_user_id"?: string | null,"changes"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"ip"?: unknown,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"tenant_id"?: string | null,"user_agent"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_kind"?: string,"actor_user_id"?: string | null,"changes"?: NonNullable<Json>,"created_at"?: string,"id"?: never,"ip"?: unknown,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"tenant_id"?: string | null,"user_agent"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"billing_payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"method": string,"notes": string | null,"paid_at": string,"recorded_by": string | null,"reference": string | null,"subscription_id": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"method": string,"notes"?: string | null,"paid_at": string,"recorded_by"?: string | null,"reference"?: string | null,"subscription_id": string,"tenant_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"method"?: string,"notes"?: string | null,"paid_at"?: string,"recorded_by"?: string | null,"reference"?: string | null,"subscription_id"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_payments_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_tenant_id_subscription_id_fkey"
      columns: ["tenant_id","subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"business_hours": {
                  Row: {
                    "closes_at": string,"id": string,"opens_at": string,"tenant_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at": string,"id"?: string,"opens_at": string,"tenant_id": string,"weekday": number
                  }
                  Update: {
                    "closes_at"?: string,"id"?: string,"opens_at"?: string,"tenant_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_hours_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"business_templates": {
                  Row: {
                    "default_categories": (string)[],"default_theme": NonNullable<Json>,"is_active": boolean,"key": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "default_categories"?: (string)[],"default_theme"?: NonNullable<Json>,"is_active"?: boolean,"key": string,"name": string
                  }
                  Update: {
                    "default_categories"?: (string)[],"default_theme"?: NonNullable<Json>,"is_active"?: boolean,"key"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"domains": {
                  Row: {
                    "created_at": string,"hostname": string,"id": string,"is_primary": boolean,"kind": string,"status": string,"tenant_id": string,"verification": NonNullable<Json>,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hostname": string,"id"?: string,"is_primary"?: boolean,"kind": string,"status"?: string,"tenant_id": string,"verification"?: NonNullable<Json>,"verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"hostname"?: string,"id"?: string,"is_primary"?: boolean,"kind"?: string,"status"?: string,"tenant_id"?: string,"verification"?: NonNullable<Json>,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "domains_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "actor_id": string | null,"actor_kind": string,"entity_id": string | null,"entity_type": string | null,"id": number,"occurred_at": string,"payload": NonNullable<Json>,"tenant_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_kind": string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"occurred_at"?: string,"payload"?: NonNullable<Json>,"tenant_id": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_kind"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"occurred_at"?: string,"payload"?: NonNullable<Json>,"tenant_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "description": string | null,"is_available": boolean,"key": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_available"?: boolean,"key": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "description"?: string | null,"is_available"?: boolean,"key"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"plans": {
                  Row: {
                    "custom_domain": boolean,"id": string,"is_public": boolean,"max_images_per_product": number,"max_members": number,"max_products": number | null,"name": string,"price_ars": number,"remove_branding": boolean,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "custom_domain"?: boolean,"id": string,"is_public"?: boolean,"max_images_per_product": number,"max_members": number,"max_products"?: number | null,"name": string,"price_ars": number,"remove_branding"?: boolean,"sort"?: number
                  }
                  Update: {
                    "custom_domain"?: boolean,"id"?: string,"is_public"?: boolean,"max_images_per_product"?: number,"max_members"?: number,"max_products"?: number | null,"name"?: string,"price_ars"?: number,"remove_branding"?: boolean,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"created_by": string | null,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reserved_slugs": {
                  Row: {
                    "slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "slug": string
                  }
                  Update: {
                    "slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string,"current_period_start": string,"id": string,"plan_id": string,"provider": string,"provider_ref": string | null,"status": string,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_period_end": string,"current_period_start"?: string,"id"?: string,"plan_id": string,"provider"?: string,"provider_ref"?: string | null,"status": string,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string,"current_period_start"?: string,"id"?: string,"plan_id"?: string,"provider"?: string,"provider_ref"?: string | null,"status"?: string,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_counters": {
                  Row: {
                    "name": string,"tenant_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string,"tenant_id": string,"value"?: number
                  }
                  Update: {
                    "name"?: string,"tenant_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_counters_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_invitations": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"revoked_at": string | null,"role": string,"tenant_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role": string,"tenant_id": string,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role"?: string,"tenant_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_invitations_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_members": {
                  Row: {
                    "created_at": string,"invited_by": string | null,"role": string,"tenant_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"invited_by"?: string | null,"role": string,"tenant_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"invited_by"?: string | null,"role"?: string,"tenant_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_members_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_modules": {
                  Row: {
                    "config": NonNullable<Json>,"enabled": boolean,"enabled_at": string,"module_key": string,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"enabled"?: boolean,"enabled_at"?: string,"module_key": string,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"enabled"?: boolean,"enabled_at"?: string,"module_key"?: string,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_modules_module_key_fkey"
      columns: ["module_key"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "tenant_modules_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_settings": {
                  Row: {
                    "accepts_delivery": boolean,"accepts_pickup": boolean,"address": string | null,"city": string | null,"closed_message": string | null,"cover_path": string | null,"currency": string,"delivery_fee": number,"description": string | null,"display_name": string,"instagram": string | null,"logo_path": string | null,"min_order_amount": number,"open_mode": string,"tagline": string | null,"template_key": string,"tenant_id": string,"theme": NonNullable<Json>,"timezone": string,"updated_at": string,"whatsapp_phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_delivery"?: boolean,"accepts_pickup"?: boolean,"address"?: string | null,"city"?: string | null,"closed_message"?: string | null,"cover_path"?: string | null,"currency"?: string,"delivery_fee"?: number,"description"?: string | null,"display_name": string,"instagram"?: string | null,"logo_path"?: string | null,"min_order_amount"?: number,"open_mode"?: string,"tagline"?: string | null,"template_key": string,"tenant_id": string,"theme"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"whatsapp_phone"?: string | null
                  }
                  Update: {
                    "accepts_delivery"?: boolean,"accepts_pickup"?: boolean,"address"?: string | null,"city"?: string | null,"closed_message"?: string | null,"cover_path"?: string | null,"currency"?: string,"delivery_fee"?: number,"description"?: string | null,"display_name"?: string,"instagram"?: string | null,"logo_path"?: string | null,"min_order_amount"?: number,"open_mode"?: string,"tagline"?: string | null,"template_key"?: string,"tenant_id"?: string,"theme"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"whatsapp_phone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_settings_template_key_fkey"
      columns: ["template_key"]
isOneToOne: false
      referencedRelation: "business_templates"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "tenant_settings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "business_type": string,"created_at": string,"id": string,"name": string,"published_at": string | null,"slug": string,"status": string,"status_reason": string | null,"trial_ends_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_type": string,"created_at"?: string,"id"?: string,"name": string,"published_at"?: string | null,"slug": string,"status"?: string,"status_reason"?: string | null,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_type"?: string,"created_at"?: string,"id"?: string,"name"?: string,"published_at"?: string | null,"slug"?: string,"status"?: string,"status_reason"?: string | null,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_business_type_fkey"
      columns: ["business_type"]
isOneToOne: false
      referencedRelation: "business_templates"
      referencedColumns: ["key"]
    }
                  ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
