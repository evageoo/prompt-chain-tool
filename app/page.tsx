import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function PromptChainTool() {
  const supabase = await createClient()

  // 1. AUTHENTICATION GATING
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md border border-slate-200">
          <h1 className="text-3xl font-black mb-4 text-slate-900 uppercase tracking-tighter">Admin Area</h1>
          <p className="text-slate-600 mb-8 font-medium">Authentication required for Chain Management.</p>
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `https://prompt-chain-tool-brown.vercel.app/auth/callback`,
                queryParams: { prompt: 'select_account' }
              },
            })
            if (data.url) redirect(data.url)
          }}>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">
              SIGN IN WITH GOOGLE
            </button>
          </form>
        </div>
      </main>
    )
  }

  // 2. AUTHORIZATION CHECK (Matrix Admin / Superadmin Only)
  const { data: profile } = await supabase.from('profiles')
    .select('is_superadmin, is_matrix_admin')
    .eq('id', user.id).single()

  if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-black text-red-500 text-center p-6">
        <h1 className="text-5xl font-black mb-4 uppercase italic">ACCESS DENIED</h1>
        <p className="text-slate-400 mb-8">User {user.email} is not authorized for the Matrix Terminal.</p>
        <form action={async () => {
          'use server'
          const supabase = await createClient()
          await supabase.auth.signOut()
          revalidatePath('/')
        }}>
          <button className="px-8 py-3 bg-white text-black rounded-xl font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
            SIGN OUT
          </button>
        </form>
      </main>
    )
  }

  // 3. FETCH DOMAIN DATA
  const { data: flavors } = await supabase.from('humor_flavors')
    .select('*, humor_flavor_steps(*)').order('created_at')

  // 4. SERVER ACTIONS
  async function addFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('humor_flavors').insert({ name: formData.get('name') })
    revalidatePath('/')
  }

  async function deleteFlavor(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('humor_flavors').delete().eq('id', formData.get('id'))
    revalidatePath('/')
  }

  async function addStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const flavor_id = formData.get('flavor_id')
    const { data: existing } = await supabase.from('humor_flavor_steps').select('step_order').eq('flavor_id', flavor_id)
    const nextOrder = (existing?.length || 0) + 1
    await supabase.from('humor_flavor_steps').insert({ flavor_id, step_order: nextOrder, instruction: 'New instruction...' })
    revalidatePath('/')
  }

  async function updateStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id')
    const instruction = formData.get('instruction') as string
    const order = Number(formData.get('order'))
    await supabase.from('humor_flavor_steps').update({ instruction, step_order: order }).eq('id', id)
    revalidatePath('/')
  }

  async function deleteStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('humor_flavor_steps').delete().eq('id', formData.get('id'))
    revalidatePath('/')
  }

  async function testFlavor(formData: FormData) {
    'use server'
    const flavorId = formData.get('flavorId')
    await fetch('https://api.almostcrackd.ai/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flavor_id: flavorId })
    })
    revalidatePath('/')
  }

  // 5. MAIN DASHBOARD UI
  return (
    <main className="min-h-screen p-10 bg-black text-white">
      <header className="mb-16 border-b border-slate-800 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-7xl font-black italic tracking-tighter uppercase">Chain_Builder</h1>
          <div className="flex items-center gap-6 mt-6">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-[0.2em] mb-1">Active Session</span>
              <p className="font-mono text-[11px] text-blue-500 uppercase">{user.email}</p>
            </div>

            {/* LOGOUT BUTTON IN HEADER */}
            <form action={async () => {
              'use server'
              const supabase = await createClient()
              await supabase.auth.signOut()
              revalidatePath('/')
            }}>
              <button className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all border border-slate-800 px-3 py-1.5 rounded-md hover:border-red-600">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <form action={addFlavor} className="flex gap-3">
          <input name="name" placeholder="New Flavor Name..." className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm outline-none focus:border-blue-500 transition-all w-64 text-white" required />
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-black text-xs hover:bg-blue-500 transition-colors uppercase">Create Flavor</button>
        </form>
      </header>

      <div className="grid gap-16">
        {flavors?.map((flavor) => (
          <section key={flavor.id} className="border-l-2 border-slate-800 pl-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-5xl font-black uppercase tracking-tighter">{flavor.name}</h2>
              <div className="flex gap-8 items-center">
                <form action={testFlavor}>
                  <input type="hidden" name="flavorId" value={flavor.id} />
                  <button type="submit" className="bg-white text-black px-8 py-2 rounded-full font-black text-xs hover:bg-blue-600 hover:text-white transition-all uppercase">
                    Test API
                  </button>
                </form>
                <form action={deleteFlavor}>
                  <input type="hidden" name="id" value={flavor.id} />
                  <button className="text-red-500 font-bold text-[10px] uppercase hover:underline">Delete Flavor</button>
                </form>
              </div>
            </div>

            <div className="space-y-4 max-w-4xl">
              {flavor.humor_flavor_steps?.sort((a: any, b: any) => a.step_order - b.step_order).map((step: any) => (
                <form action={updateStep} key={step.id} className="flex gap-6 items-center bg-slate-900/40 p-5 rounded-2xl group border border-slate-800 hover:border-blue-500 transition-all">
                  <input type="hidden" name="id" value={step.id} />
                  <input name="order" type="number" defaultValue={step.step_order} className="w-12 bg-black text-blue-500 font-black text-center rounded-lg p-2 outline-none border border-slate-800" />
                  <input name="instruction" defaultValue={step.instruction} className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-blue-500 py-1 font-bold text-lg text-slate-300" />
                  <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="submit" className="bg-blue-600 text-[10px] px-4 py-2 rounded-md font-black uppercase">Save</button>
                    <button formAction={deleteStep} className="text-red-600 text-[10px] font-black uppercase">Remove</button>
                  </div>
                </form>
              ))}

              <form action={addStep}>
                <input type="hidden" name="flavor_id" value={flavor.id} />
                <button className="w-full py-4 border-2 border-dashed border-slate-800 text-slate-600 font-black text-xs hover:text-blue-500 hover:border-blue-500 transition-all rounded-2xl mt-6 uppercase">
                  + Add Step
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}