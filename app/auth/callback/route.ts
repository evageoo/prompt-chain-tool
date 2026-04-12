import { createClient } from '@/utils/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure we go to the tool, not the home page
      return NextResponse.redirect(`${origin}/prompt-chain`)
    }
  }

  return NextResponse.redirect(origin)
}