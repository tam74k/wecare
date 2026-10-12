import { createClient } from '@supabase/supabase-js';

// استخراج مفاتيح الاتصال من متغيرات البيئة (دعم بادئات Vite و Next.js بأمان تام)
const env = (import.meta as any).env || {};
const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ipfcmayvwdblwnnxhbhb.supabase.co';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZmNtYXl2d2RibHdubnhoYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjQxMTgsImV4cCI6MjEwNDE0MDExOH0.IOBMEkfE_JvfMMM7hVMiBgDNYF2skDER4NHKhLpf1d0';

// التحقق من صحة مفاتيح السحابة
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

// عميل Supabase الرئيسي - المصدر الوحيد للحقيقة (Single Source of Truth)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
