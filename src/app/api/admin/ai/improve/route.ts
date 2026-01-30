import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { improveDescriptionWithAI } from '@/lib/openrouter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const bypassHeader = request.headers.get('X-Admin-Bypass');
    
    // Allow bypass if header is present (for local dev/admin fallback)
    const isBypass = bypassHeader === 'true';

    if (!isBypass) {
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const improvedText = await improveDescriptionWithAI(text);

    return NextResponse.json({ improvedText });
  } catch (error: any) {
    console.error('[API AI Improve] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
