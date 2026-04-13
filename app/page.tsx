"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PromptChainTool() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();
  const [flavors, setFlavors] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlavors = async () => {
    const { data } = await supabase
      .from('humor_flavors')
      .select('*, humor_flavor_steps(*)')
      .order('created_datetime_utc', { ascending: false })
      .order('order_by', { foreignTable: 'humor_flavor_steps', ascending: true });
    setFlavors(data || []);
  };

  useEffect(() => {
    async function getData() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      setUser(currentUser);
      await fetchFlavors();
      setLoading(false);
    }
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFlavor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    await supabase.from('humor_flavors').insert({
      description: name,
      slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      created_by_user_id: user?.id,
      modified_by_user_id: user?.id
    });
    await fetchFlavors();
    (e.target as HTMLFormElement).reset();
  }

  async function deleteFlavor(flavorId: string, flavorName: string) {
    if (!confirm(`CRITICAL: Delete "${flavorName}" and ALL steps?`)) return;
    await supabase.from('humor_flavors').delete().eq('id', flavorId);
    await fetchFlavors();
  }

  async function addStep(flavorId: string, currentCount: number) {
    await supabase.from('humor_flavor_steps').insert({
      humor_flavor_id: flavorId,
      order_by: currentCount + 1,
      llm_user_prompt: "", // Starting with empty string instead of null
      llm_input_type_id: 1, llm_output_type_id: 1, llm_model_id: 1, humor_flavor_step_type_id: 1,
      created_by_user_id: user?.id, modified_by_user_id: user?.id
    });
    await fetchFlavors();
  }

  async function updateStep(e: React.FormEvent<HTMLFormElement>, stepId: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const instruction = formData.get('instruction') as string;

    await supabase.from('humor_flavor_steps').update({
      llm_user_prompt: instruction,
      modified_by_user_id: user?.id
    }).eq('id', stepId);

    alert("Logic updated.");
    await fetchFlavors();
  }

  async function deleteStep(stepId: string) {
    if (!confirm("Delete this logic gate?")) return;
    await supabase.from('humor_flavor_steps').delete().eq('id', stepId);
    await fetchFlavors();
  }

  if (loading) return <div className="min-h-screen bg-black text-white p-10 font-mono">LOADING_MATRIX...</div>;

  return (
    <main className="min-h-screen p-10 bg-black text-white font-sans">
      <header className="mb-16 border-b border-white/10 pb-10 flex justify-between items-end">
        <div>
          <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">Matrix</h1>
          <p className="text-[10px] text-blue-500 font-mono mt-4 uppercase tracking-[0.3em]">Joke Engine // Admin_Chain_Builder</p>
        </div>
        <form onSubmit={addFlavor} className="flex gap-3 items-center">
          <input name="name" placeholder="NEW_FLAVOR..." className="bg-transparent border-b border-white/20 p-2 text-xs outline-none focus:border-blue-500 text-white w-56" required />
          <button type="submit" className="bg-white text-black px-5 py-2 rounded-full font-black uppercase text-[10px] hover:bg-blue-500 hover:text-white transition-all">Create</button>
        </form>
      </header>

      <div className="space-y-32">
        {flavors.map((flavor) => (
          <div key={flavor.id} className="border-l-2 border-white/10 pl-10">
            <div className="mb-10 flex justify-between items-center">
              <h2 className="text-6xl font-black uppercase italic text-blue-500">{flavor.description}</h2>
              <button onClick={() => deleteFlavor(flavor.id, flavor.description)} className="text-[9px] font-mono text-white/20 border border-white/10 px-4 py-2 rounded-full hover:bg-red-600 hover:text-white transition-all">Terminate_Flavor</button>
            </div>

            <div className="space-y-6">
              {flavor.humor_flavor_steps?.map((step: any) => (
                <div key={step.id} className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                  <form onSubmit={(e) => updateStep(e, step.id)}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-blue-500 font-mono text-[10px] font-bold">Logic_Gate_{step.order_by}</span>

                      <div className="flex gap-2">
                        <button type="submit" className="text-[9px] bg-white text-black px-4 py-1.5 rounded-full uppercase font-black hover:bg-blue-500 hover:text-white transition-all">
                          Update_Gate
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteStep(step.id)}
                          className="text-[9px] bg-red-600/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-full uppercase font-black hover:bg-red-600 hover:text-white transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <textarea
                      name="instruction"
                      defaultValue={step.llm_user_prompt || ''} // Fallback to empty string fixes the Vercel error
                      className="bg-transparent w-full text-white/70 font-mono text-sm outline-none focus:text-white resize-none leading-relaxed"
                      rows={3}
                    />
                  </form>
                </div>
              ))}

              <button
                onClick={() => addStep(flavor.id, flavor.humor_flavor_steps?.length || 0)}
                className="w-full py-6 border-2 border-dashed border-white/5 rounded-3xl text-[10px] text-white/20 hover:border-blue-500/40 hover:text-blue-500 transition-all uppercase font-black tracking-[0.4em]"
              >
                + Append_Logic_Gate
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="h-40" />
    </main>
  );
}