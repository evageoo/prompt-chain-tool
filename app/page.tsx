import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function PromptChainTool() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black">
        <form action={async () => {
          'use server'
          const supabase = await createClient()
          const host = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${process.env.VERCEL_URL}`
          const { data } = await supabase.auth.signInWithOAuth({
            provider: 'google', options: { redirectTo: `${host}/auth/callback` },
          })
          if (data.url) redirect(data.url)
        }}>
          <button className="border border-white text-white px-8 py-4 uppercase font-black hover:bg-white hover:text-black transition-all">Login</button>
        </form>
      </main>
    )
  }

  // We fetch flavors and join the steps table
  const { data: flavors, error: fetchError } = await supabase
    .from('humor_flavors')
    .select('*, humor_flavor_steps(*)')
    .order('created_datetime_utc', { ascending: false })

  async function addFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nameValue = formData.get('name') as string
    const slugValue = nameValue.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

    // Michael's Breaking Change Requirements
    const { error } = await supabase.from('humor_flavors').insert({
      description: nameValue,
      slug: slugValue,
      created_by_user_id: user.id,
      modified_by_user_id: user.id
    })

    if (error) console.error("INSERT_ERROR:", error.message)
    revalidatePath('/prompt-chain')
  }

  return (
    <main className="min-h-screen p-10 bg-black text-white font-sans">
      <header className="mb-12 flex justify-between items-end border-b border-white/10 pb-10">
        <div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter">Matrix</h1>
          <p className="text-[10px] text-blue-500 font-mono mt-2 uppercase">Verified_Session // {user.email}</p>
        </div>
        <form action={addFlavor} className="flex gap-3">
          <input name="name" placeholder="NEW_FLAVOR_INPUT..." className="bg-transparent border-b border-white/20 p-2 text-sm outline-none focus:border-blue-500 w-64 text-white" required />
          <button type="submit" className="bg-white text-black px-6 py-2 rounded-full font-black uppercase text-[10px] hover:invert transition-all">Create</button>
        </form>
      </header>

      {fetchError && <div className="text-red-500 font-mono text-[10px] mb-10">DB_FETCH_ERROR: {fetchError.message}</div>}

      <div className="grid gap-10">
        {!flavors || flavors.length === 0 ? (
          <p className="text-white/20 uppercase font-black text-xs italic">No active data streams.</p>
        ) : (
          flavors.map((flavor) => (
            <div key={flavor.id} className="border-l-2 border-white/10 pl-8 py-2">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-4xl font-black uppercase italic text-blue-500">
                  {flavor.description}
                </h2>
                <div className="text-right font-mono text-[8px] text-white/30 uppercase">
                  <p>Slug: {flavor.slug}</p>
                  <p>Audit: {String(flavor.created_by_user_id).slice(0,8)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* FIX: Check if humor_flavor_steps exist and use llm_user_prompt */}
                {flavor.humor_flavor_steps && flavor.humor_flavor_steps.length > 0 ? (
                  flavor.humor_flavor_steps
                    .sort((a: any, b: any) => a.step_order - b.step_order)
                    .map((step: any) => (
                      <div key={step.id} className="p-4 bg-white/5 border border-white/5 rounded-lg">
                        <div className="flex gap-4 items-start">
                          <span className="text-blue-500 font-mono text-[10px] font-bold mt-1">STEP_{step.step_order}</span>
                          <p className="text-white/70 font-mono text-xs leading-relaxed">
                            {/* This is the key we found in your screenshot! */}
                            {step.llm_user_prompt}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="p-4 border border-dashed border-white/10 rounded-lg">
                    <p className="text-[10px] text-white/20 uppercase font-bold italic tracking-widest">No steps linked to this flavor id</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}