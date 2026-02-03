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

    const improvedText = await improveDescriptionWithAI(text);

    return NextResponse.json({ improvedText });
  } catch (error: any) {
    console.error('[API AI Improve] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
