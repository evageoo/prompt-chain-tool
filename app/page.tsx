import { createClient } from '@/utils/supabaseServer'
import { revalidatePath } from 'next/cache'

export default async function PromptChainTool() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. SECURITY GATING
  if (!user) return <div className="p-20 text-center">Please Login</div>
  const { data: profile } = await supabase.from('profiles')
    .select('is_superadmin, is_matrix_admin')
    .eq('id', user.id).single()

  if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
    return <div className="p-20 text-center text-red-500">Access Denied: Matrix Admin Required</div>
  }

  // 2. FETCH DATA
  const { data: flavors } = await supabase.from('humor_flavors')
    .select('*, humor_flavor_steps(*)').order('created_at')

  // 3. SERVER ACTIONS
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
    // Correct API endpoint for Assignment 7
    await fetch('https://api.almostcrackd.ai/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flavor_id: flavorId })
    })
    revalidatePath('/')
  }

  return (
    <main className="min-h-screen p-10 bg-white dark:bg-black text-slate-900 dark:text-white transition-all">
      <header className="mb-12 border-b-4 border-black dark:border-white pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase">Chain_Builder_v1</h1>
          <p className="font-mono text-xs mt-2 opacity-50 text-blue-500 italic">LOGGED_IN: {user.email}</p>
        </div>

        <form action={addFlavor} className="flex gap-2">
          <input name="name" placeholder="Flavor Name..." className="bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-300 dark:border-slate-700 text-sm outline-none focus:border-blue-500" required />
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-xs hover:bg-blue-500 transition-colors uppercase">Create Flavor</button>
        </form>
      </header>

      <div className="grid gap-12">
        {flavors?.map((flavor) => (
          <section key={flavor.id} className="border-l-8 border-blue-600 pl-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-black uppercase tracking-tight">{flavor.name}</h2>
              <div className="flex gap-6 items-center">
                {/* TEST API FORM (Ensures network activity visible in Inspect) */}
                <form action={testFlavor}>
                  <input type="hidden" name="flavorId" value={flavor.id} />
                  <button type="submit" className="bg-white text-black px-6 py-2 rounded-full font-black text-xs hover:scale-105 transition-transform uppercase">
                    Test API
                  </button>
                </form>
                <form action={deleteFlavor}>
                  <input type="hidden" name="id" value={flavor.id} />
                  <button className="text-red-500 font-bold text-[10px] uppercase hover:underline">Delete Flavor</button>
                </form>
              </div>
            </div>

            <div className="space-y-3">
              {flavor.humor_flavor_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step: any) => (
                <form action={updateStep} key={step.id} className="flex gap-4 items-center bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl group border border-transparent hover:border-slate-800">
                  <input type="hidden" name="id" value={step.id} />
                  <input name="order" type="number" defaultValue={step.step_order} className="w-10 bg-black text-blue-500 font-black text-center rounded p-1 outline-none border border-slate-800" />
                  <input name="instruction" defaultValue={step.instruction} className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-blue-500 py-1 font-medium" />
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="submit" className="bg-blue-600 text-[10px] px-3 py-1 rounded font-bold uppercase">Save</button>
                    <button formAction={deleteStep} className="text-red-500 text-[10px] font-bold uppercase">Remove</button>
                  </div>
                </form>
              ))}

              <form action={addStep}>
                <input type="hidden" name="flavor_id" value={flavor.id} />
                <button className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-800 text-slate-500 font-bold text-xs hover:text-blue-500 hover:border-blue-500 transition-all rounded-xl mt-4 uppercase">
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