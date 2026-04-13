"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PromptChainTool() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [flavors, setFlavors] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function handleLogin() {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

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
      if (!currentUser) { setLoading(false); return; }
      setUser(currentUser);
      await fetchFlavors();
      setLoading(false);
    }
    getData();
  }, []);

  // --- NEW: DUPLICATE LOGIC ---
  async function duplicateFlavor(flavorId: string, description: string) {
    const newName = prompt("Enter name for duplicate:", `${description} (Copy)`);
    if (!newName) return;
    setLoading(true);

    const { data: newFlavor, error: fErr } = await supabase.from('humor_flavors').insert({
      description: newName,
      slug: newName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      created_by_user_id: user?.id,
      modified_by_user_id: user?.id
    }).select().single();

    if (fErr) { alert("Error duplicating"); setLoading(false); return; }

    const { data: oldSteps } = await supabase.from('humor_flavor_steps').select('*').eq('humor_flavor_id', flavorId);

    if (oldSteps && oldSteps.length > 0) {
      const clonedSteps = oldSteps.map(s => ({
        humor_flavor_id: newFlavor.id,
        order_by: s.order_by,
        llm_user_prompt: s.llm_user_prompt,
        llm_input_type_id: s.llm_input_type_id,
        llm_output_type_id: s.llm_output_type_id,
        llm_model_id: s.llm_model_id,
        humor_flavor_step_type_id: s.humor_flavor_step_type_id,
        created_by_user_id: user?.id,
        modified_by_user_id: user?.id
      }));
      await supabase.from('humor_flavor_steps').insert(clonedSteps);
    }
    await fetchFlavors();
    setLoading(false);
  }

  async function addFlavor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    await supabase.from('humor_flavors').insert({
      description: name, slug: name.toLowerCase().replace(/ /g, '-'),
      created_by_user_id: user?.id, modified_by_user_id: user?.id
    });
    await fetchFlavors();
    (e.target as HTMLFormElement).reset();
  }

  async function deleteFlavor(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    await supabase.from('humor_flavors').delete().eq('id', id);
    await fetchFlavors();
  }

  async function addStep(flavorId: string, count: number) {
    await supabase.from('humor_flavor_steps').insert({
      humor_flavor_id: flavorId, order_by: count + 1, llm_user_prompt: "",
      llm_input_type_id: 1, llm_output_type_id: 1, llm_model_id: 1, humor_flavor_step_type_id: 1,
      created_by_user_id: user?.id, modified_by_user_id: user?.id
    });
    await fetchFlavors();
  }

  async function updateStep(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const val = new FormData(e.currentTarget).get('instruction') as string;
    await supabase.from('humor_flavor_steps').update({ llm_user_prompt: val, modified_by_user_id: user?.id }).eq('id', id);
    alert("Updated.");
    await fetchFlavors();
  }

  async function deleteStep(id: string) {
    if (!confirm("Delete step?")) return;
    await supabase.from('humor_flavor_steps').delete().eq('id', id);
    await fetchFlavors();
  }

  if (loading) return <div className="min-h-screen bg-black text-blue-500 p-10 font-mono flex items-center justify-center animate-pulse">SYNCING_MATRIX...</div>;

  if (!user) return (
    <div className="min-h-screen bg-black text-white p-10 font-mono flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-black text-blue-500 uppercase italic">Access Denied</h1>
      <button onClick={handleLogin} className="bg-white text-black px-10 py-4 rounded-full font-black uppercase text-xs hover:bg-blue-500 hover:text-white transition-all">Initialize_Auth</button>
    </div>
  );

  return (
    <main className="min-h-screen p-10 bg-black text-white font-sans">
      <header className="mb-16 border-b border-white/10 pb-10 flex justify-between items-start">
        <div>
          <h1 className="text-8xl font-black italic uppercase tracking-tighter">Matrix</h1>
          <div className="mt-6 flex items-center gap-4 text-[9px] font-mono">
            <span className="text-white/50">User: {user.email}</span>
            <button onClick={handleLogout} className="text-red-500 hover:text-white uppercase">[Terminate]</button>
          </div>
        </div>
        <form onSubmit={addFlavor} className="flex gap-3 items-center">
          <input name="name" placeholder="NEW_FLAVOR..." className="bg-transparent border-b border-white/20 p-2 text-xs outline-none focus:border-blue-500 w-56" required />
          <button type="submit" className="bg-white text-black px-5 py-2 rounded-full font-black text-[10px] uppercase">Create</button>
        </form>
      </header>

      <div className="space-y-32">
        {flavors.map((flavor) => (
          <div key={flavor.id} className="border-l-2 border-white/10 pl-10">
            <div className="mb-10 flex justify-between items-center">
              <h2 className="text-6xl font-black uppercase italic text-blue-500 tracking-tighter">{flavor.description}</h2>
              <div className="flex gap-4">
                <button onClick={() => duplicateFlavor(flavor.id, flavor.description)} className="text-[9px] font-mono text-blue-400 border border-blue-500/20 px-4 py-2 rounded-full hover:bg-blue-500 hover:text-white transition-all uppercase">Duplicate</button>
                <button onClick={() => deleteFlavor(flavor.id, flavor.description)} className="text-[9px] font-mono text-white/20 border border-white/10 px-4 py-2 rounded-full hover:bg-red-600 hover:text-white transition-all uppercase">Delete</button>
              </div>
            </div>
            <div className="space-y-6">
              {flavor.humor_flavor_steps?.map((step: any) => (
                <div key={step.id} className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 group">
                  <form onSubmit={(e) => updateStep(e, step.id)}>
                    <div className="flex justify-between items-center mb-4 text-[10px] font-mono font-bold uppercase text-blue-500">
                      <span>Gate_{step.order_by}</span>
                      <div className="flex gap-2">
                        <button type="submit" className="bg-white text-black px-3 py-1 rounded-full">Save</button>
                        <button type="button" onClick={() => deleteStep(step.id)} className="text-red-500">Del</button>
                      </div>
                    </div>
                    <textarea name="instruction" defaultValue={step.llm_user_prompt || ''} className="bg-transparent w-full text-white/70 font-mono text-sm outline-none" rows={2} />
                  </form>
                </div>
              ))}
              <button onClick={() => addStep(flavor.id, flavor.humor_flavor_steps?.length || 0)} className="w-full py-4 border-2 border-dashed border-white/5 rounded-3xl text-[10px] text-white/20 uppercase font-black">+ Append_Gate</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}