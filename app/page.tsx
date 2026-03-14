import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
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

  // 3. CRUD ACTIONS
  async function updateStep(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id')
    const instruction = formData.get('instruction') as string
    const order = Number(formData.get('order'))
    await supabase.from('humor_flavor_steps').update({ instruction, step_order: order }).eq('id', id)
    revalidatePath('/')
  }

  async function testFlavor(formData: FormData) {
    'use server'
    const flavorId = formData.get('flavorId')
    // Call the Assignment 5 API
    await fetch('https://api.almostcrackd.ai/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flavor_id: flavorId })
    })
    revalidatePath('/')
  }

  return (
    <main className="min-h-screen p-10 bg-white dark:bg-black text-slate-900 dark:text-white transition-all">
      <header className="mb-12 border-b-4 border-black dark:border-white pb-4">
        <h1 className="text-6xl font-black italic tracking-tighter">CHAIN_BUILDER_V1</h1>
        <p className="font-mono text-xs mt-2 opacity-50">LOGGED_IN: {user.email}</p>
      </header>

      <div className="grid gap-12">
        {flavors?.map((flavor) => (
          <section key={flavor.id} className="border-l-8 border-blue-600 pl-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-black uppercase tracking-tight">{flavor.name}</h2>
              <form action={testFlavor}>
                <input type="hidden" name="flavorId" value={flavor.id} />
                <button className="bg-slate-900 dark:bg-white dark:text-black text-white px-8 py-3 rounded-full font-black hover:scale-105 transition-transform">
                  RUN TEST
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {flavor.humor_flavor_steps?.sort((a:any, b:any) => a.step_order - b.step_order).map((step: any) => (
                <form action={updateStep} key={step.id} className="flex gap-4 items-center bg-slate-100 dark:bg-slate-900 p-6 rounded-2xl group">
                  <input type="hidden" name="id" value={step.id} />
                  <input name="order" type="number" defaultValue={step.step_order} className="w-16 bg-white dark:bg-black p-2 rounded-lg font-bold text-center border-2 border-transparent focus:border-blue-500 outline-none" title="Step Order" />
                  <input name="instruction" defaultValue={step.instruction} className="flex-1 bg-transparent font-medium outline-none border-b border-transparent focus:border-slate-400 p-1" title="Step Instruction" />
                  <button type="submit" className="opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase bg-blue-600 text-white px-3 py-1 rounded">Update</button>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}