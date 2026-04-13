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
          <button className="border-2 border-white text-white px-8 py-4 uppercase font-black">Login</button>
        </form>
      </main>
    )
  }

  // FIX: Moved sort logic here to prevent Hydration errors
  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('*, humor_flavor_steps(*)')
    .order('created_datetime_utc', { ascending: false })
    .order('order_by', { foreignTable: 'humor_flavor_steps', ascending: true })

  // --- SERVER ACTIONS ---

  async function addFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const name = formData.get('name') as string
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    await supabase.from('humor_flavors').insert({
      description: name, slug, created_by_user_id: user?.id, modified_by_user_id: user?.id
    })
    revalidatePath('/prompt-chain')
  }

  async function updateFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_flavors').update({
      description: formData.get('description'), modified_by_user_id: user?.id
    }).eq('id', formData.get('id'))
    revalidatePath('/prompt-chain')
  }

  async function addStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const flavorId = formData.get('flavorId')
    const count = parseInt(formData.get('currentCount') || '0')

    await supabase.from('humor_flavor_steps').insert({
      humor_flavor_id: flavorId,
      order_by: count + 1,
      llm_user_prompt: "New instruction...",
      llm_input_type_id: 1,
      llm_output_type_id: 1,
      llm_model_id: 1,
      humor_flavor_step_type_id: 1,
      created_by_user_id: user?.id,
      modified_by_user_id: user?.id
    })
    revalidatePath('/prompt-chain')
  }

  async function updateStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_flavor_steps').update({
      llm_user_prompt: formData.get('instruction'), modified_by_user_id: user?.id
    }).eq('id', formData.get('stepId'))
    revalidatePath('/prompt-chain')
  }

  async function deleteStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('humor_flavor_steps').delete().eq('id', formData.get('stepId'))
    revalidatePath('/prompt-chain')
  }

  return (
    <main className="min-h-screen p-10 bg-black text-white">
      <header className="mb-16 border-b border-white/10 pb-10 flex justify-between items-end">
        <div>
          <h1 className="text-7xl font-black italic uppercase tracking-tighter leading-none">Matrix</h1>
          <p className="text-[10px] text-blue-500 font-mono mt-4 uppercase tracking-[0.2em]">Assignment_11 // Online</p>
        </div>
        <form action={addFlavor} className="flex gap-2">
          <input name="name" placeholder="NEW_FLAVOR..." className="bg-transparent border-b border-white/20 p-2 text-xs outline-none focus:border-blue-500 text-white" required />
          <button type="submit" className="bg-white text-black px-4 py-2 rounded-full font-black uppercase text-[10px]">Add Flavor</button>
        </form>
      </header>

      <div className="space-y-24">
        {flavors?.map((flavor: any) => (
          <div key={flavor.id} className="border-l-2 border-white/10 pl-10">
            <form action={updateFlavor} className="mb-8 flex gap-4 items-center group">
              <input type="hidden" name="id" value={flavor.id} />
              <input name="description" defaultValue={flavor.description} className="bg-transparent text-5xl font-black uppercase italic text-blue-500 w-full outline-none" />
              <button type="submit" className="bg-blue-600 text-[9px] px-4 py-1 rounded-full opacity-0 group-hover:opacity-100 uppercase font-black transition-all">Save</button>
            </form>

            <div className="space-y-4">
              {flavor.humor_flavor_steps?.map((step: any, index: number) => (
                <div key={step.id} className="flex gap-4 group/step">
                  <form action={updateStep} className="flex-1 bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:border-blue-500/40 transition-all flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-500 font-mono text-[10px] font-bold uppercase tracking-widest">Sequence_{index + 1}</span>
                      <button type="submit" className="text-[9px] bg-white/10 hover:bg-blue-600 text-white px-3 py-1 rounded uppercase font-bold opacity-0 group-hover/step:opacity-100 transition-all">Update</button>
                    </div>
                    <input type="hidden" name="stepId" value={step.id} />
                    <textarea name="instruction" defaultValue={step.llm_user_prompt} className="bg-transparent w-full text-white/80 font-mono text-sm outline-none focus:text-white resize-none" rows={2} />
                  </form>
                  <form action={deleteStep} className="pt-2">
                    <input type="hidden" name="stepId" value={step.id} />
                    <button type="submit" className="text-white/10 hover:text-red-500 text-xl font-light px-2 transition-colors">✕</button>
                  </form>
                </div>
              ))}

              <form action={addStep} className="pt-4">
                <input type="hidden" name="flavorId" value={flavor.id} />
                <input type="hidden" name="currentCount" value={flavor.humor_flavor_steps?.length || 0} />
                <button type="submit" className="text-[11px] border-2 border-white text-white px-6 py-3 rounded-full hover:bg-white hover:text-black transition-all uppercase font-black tracking-tight">
                  + Create New Step
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}