import { NextResponse } from 'next/server';
import { improveDescriptionWithAI } from '@/lib/openrouter';
import { checkApiAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Auth check
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length to prevent issues
    if (text.length > 10000) {
      return NextResponse.json({ error: 'Text too long (max 10000 characters)' }, { status: 400 });
    }

    console.log('[API AI Improve] Processing text length:', text.length);
    const improvedText = await improveDescriptionWithAI(text);

    return NextResponse.json({ improvedText });
  } catch (error: any) {
    console.error('[API AI Improve] Error:', error);
    
    // Sanitize error message
    let errorMessage = 'Internal Server Error';
    if (error?.message) {
      errorMessage = error.message
        .replace(/[\x00-\x1F\x7F]/g, '')
        .substring(0, 500);
    }
    
    try {
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    } catch (jsonError) {
      console.error('[API AI Improve] Failed to serialize error:', jsonError);
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }
}
