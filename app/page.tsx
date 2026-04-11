import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function PromptChainTool() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 1. AUTH GATE
  if (!user || authError) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-100 p-6">
        <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md border border-slate-200">
          <h1 className="text-3xl font-black mb-4 text-slate-900 uppercase tracking-tighter">Admin Area</h1>
          <p className="text-slate-600 mb-8 font-medium">Authentication required for Chain Management.</p>
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `https://${process.env.VERCEL_URL}/auth/callback` },
            })
            if (data.url) redirect(data.url)
          }}>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">Sign In with Google</button>
          </form>
        </div>
      </main>
    )
  }

  // 2. AUTHORIZATION
  const { data: profile } = await supabase.from('profiles').select('is_superadmin, is_matrix_admin').eq('id', user.id).single()
  if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
    return <main className="h-screen bg-black text-red-500 flex items-center justify-center font-black">ACCESS DENIED</main>
  }

  // 3. FETCH DATA
  const { data: flavors } = await supabase.from('humor_flavors').select('*, humor_flavor_steps(*)').order('created_at')

  // 4. SERVER ACTIONS (Michael's DB Fix + Feedback logic)
  async function addFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_flavors').insert({
      name: formData.get('name'),
      created_by_user_id: user?.id,
      modified_by_user_id: user?.id
    })
    revalidatePath('/')
  }

  async function updateStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_flavor_steps').update({
        instruction: formData.get('instruction'),
        step_order: Number(formData.get('order')),
        modified_by_user_id: user?.id
    }).eq('id', formData.get('id'))
    revalidatePath('/')
  }

  async function deleteStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('humor_flavor_steps').delete().eq('id', formData.get('id'))
    revalidatePath('/')
  }

  return (
    <main className="min-h-screen p-10 bg-black text-white">
      <header className="mb-16 border-b border-slate-800 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-7xl font-black italic tracking-tighter uppercase">Chain_Builder</h1>
          <p className="font-mono text-[11px] text-blue-500 uppercase mt-4">Operator: {user.email}</p>
        </div>
        <form action={addFlavor} className="flex gap-3">
          <input name="name" placeholder="New Flavor Name..." className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm outline-none focus:border-blue-500 w-64 text-white" required />
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-black text-xs hover:bg-blue-500 uppercase">Create</button>
        </form>
      </header>

      <div className="grid gap-16">
        {flavors?.map((flavor) => (
          <section key={flavor.id} className="border-l-2 border-slate-800 pl-10">
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-10">{flavor.name}</h2>
            <div className="space-y-4 max-w-4xl">
              {flavor.humor_flavor_steps?.sort((a: any, b: any) => a.step_order - b.step_order).map((step: any) => (
                <form action={updateStep} key={step.id} className="flex gap-6 items-start bg-slate-900/40 p-5 rounded-2xl group border border-slate-800 hover:border-blue-500 transition-all">
                  <input type="hidden" name="id" value={step.id} />
                  <input name="order" type="number" defaultValue={step.step_order} className="w-12 bg-black text-blue-500 font-black text-center rounded-lg p-2 border border-slate-800" />

                  {/* FEEDBACK UPDATE: Textarea for better visibility */}
                  <textarea
                    name="instruction"
                    defaultValue={step.instruction}
                    className="flex-1 bg-transparent outline-none py-1 font-bold text-lg text-slate-300 resize-none min-h-[40px]"
                    onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }}
                  />

                  <div className="flex gap-4 opacity-0 group-hover:opacity-100">
                    <button type="submit" className="bg-blue-600 text-[10px] px-4 py-2 rounded-md font-black uppercase">Save</button>
                    {/* FEEDBACK UPDATE: Confirm before delete */}
                    <button formAction={deleteStep} onClick={(e) => { if(!confirm("Delete this step?")) e.preventDefault() }} className="text-red-600 text-[10px] font-black uppercase">Remove</button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}