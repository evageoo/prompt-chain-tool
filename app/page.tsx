'use client'

// NOTE: Because the dashboard needs hooks/state, this whole file is a client component.
// Auth is handled via supabase browser client on mount instead of server-side.

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type AppState = 'loading' | 'unauthenticated' | 'unauthorized' | 'dashboard'

type Section =
  | 'statistics'
  | 'profiles' | 'images' | 'humor_flavors' | 'humor_flavor_steps'
  | 'terms' | 'captions' | 'caption_requests' | 'caption_examples'
  | 'llm_models' | 'llm_providers' | 'llm_prompt_chains' | 'llm_model_responses'
  | 'allowed_signup_domains' | 'whitelist_email_addresses' | 'humor_flavor_mix'

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ key: 'statistics', label: '📊 Statistics' }],
  },
  {
    label: 'People',
    items: [{ key: 'profiles', label: 'Profiles' }],
  },
  {
    label: 'Content',
    items: [
      { key: 'images', label: 'Images' },
      { key: 'captions', label: 'Captions' },
      { key: 'caption_requests', label: 'Caption Requests' },
      { key: 'caption_examples', label: 'Caption Examples' },
      { key: 'terms', label: 'Terms' },
    ],
  },
  {
    label: 'AI / Generation',
    items: [
      { key: 'humor_flavors', label: 'Humor Flavors' },
      { key: 'humor_flavor_steps', label: 'Flavor Steps' },
      { key: 'humor_flavor_mix', label: 'Humor Mix' },
      { key: 'llm_models', label: 'LLM Models' },
      { key: 'llm_providers', label: 'LLM Providers' },
      { key: 'llm_prompt_chains', label: 'Prompt Chains' },
      { key: 'llm_model_responses', label: 'LLM Responses' },
    ],
  },
  {
    label: 'Access Control',
    items: [
      { key: 'allowed_signup_domains', label: 'Signup Domains' },
      { key: 'whitelist_email_addresses', label: 'Whitelisted Emails' },
    ],
  },
]

const CAN_CREATE: Section[] = [
  'images', 'terms', 'caption_examples', 'llm_models', 'llm_providers',
  'allowed_signup_domains', 'whitelist_email_addresses',
]
const CAN_UPDATE: Section[] = [
  'images', 'terms', 'caption_examples', 'llm_models', 'llm_providers',
  'allowed_signup_domains', 'whitelist_email_addresses', 'humor_flavor_mix',
]
const CAN_DELETE: Section[] = [
  'images', 'terms', 'caption_examples', 'llm_models', 'llm_providers',
  'allowed_signup_domains', 'whitelist_email_addresses',
]

const COLUMNS: Record<Section, string[]> = {
  statistics: [],
  profiles: ['id', 'first_name', 'last_name', 'email', 'is_superadmin', 'is_in_study', 'is_matrix_admin', 'created_datetime_utc'],
  images: ['id', 'url', 'is_public', 'is_common_use', 'image_description', 'created_datetime_utc'],
  humor_flavors: ['id', 'slug', 'description', 'created_datetime_utc'],
  humor_flavor_steps: ['id', 'humor_flavor_id', 'step_order', 'temperature', 'created_datetime_utc'],
  humor_flavor_mix: ['id', 'name', 'created_datetime_utc'],
  terms: ['id', 'term', 'definition', 'created_datetime_utc'],
  captions: ['id', 'content', 'image_id', 'profile_id', 'is_public', 'is_featured', 'caption_request_id', 'humor_flavor_id'],
  caption_requests: ['id', 'image_id', 'profile_id', 'created_datetime_utc'],
  caption_examples: ['id', 'caption_text', 'humor_flavor_id', 'is_active', 'created_datetime_utc'],
  llm_models: ['id', 'name', 'slug', 'llm_provider_id', 'is_active', 'created_datetime_utc'],
  llm_providers: ['id', 'name', 'slug', 'api_base_url', 'is_active', 'created_datetime_utc'],
  llm_prompt_chains: ['id', 'caption_request_id', 'humor_flavor_id', 'created_datetime_utc'],
  llm_model_responses: ['id', 'llm_prompt_chain_id', 'model', 'processing_time_ms', 'created_datetime_utc'],
  allowed_signup_domains: ['id', 'domain', 'created_datetime_utc'],
  whitelist_email_addresses: ['id', 'email', 'created_datetime_utc'],
}

const FORM_FIELDS: Record<Section, { key: string; label: string; type: string; required?: boolean }[]> = {
  statistics: [],
  profiles: [],
  images: [
    { key: 'url', label: 'Image URL', type: 'url', required: true },
    { key: 'image_description', label: 'Description', type: 'text' },
    { key: 'is_public', label: 'Public', type: 'checkbox' },
    { key: 'is_common_use', label: 'Common Use', type: 'checkbox' },
  ],
  humor_flavors: [],
  humor_flavor_steps: [],
  humor_flavor_mix: [
    { key: 'name', label: 'Name', type: 'text', required: true },
  ],
  terms: [
    { key: 'term', label: 'Term', type: 'text', required: true },
    { key: 'definition', label: 'Definition', type: 'textarea', required: true },
  ],
  captions: [],
  caption_requests: [],
  caption_examples: [
    { key: 'caption_text', label: 'Caption Text', type: 'textarea', required: true },
    { key: 'humor_flavor_id', label: 'Humor Flavor ID', type: 'text' },
    { key: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  llm_models: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true },
    { key: 'llm_provider_id', label: 'Provider ID', type: 'text' },
    { key: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  llm_providers: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true },
    { key: 'api_base_url', label: 'API Base URL', type: 'url' },
    { key: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  llm_prompt_chains: [],
  llm_model_responses: [],
  allowed_signup_domains: [
    { key: 'domain', label: 'Domain (e.g. example.com)', type: 'text', required: true },
  ],
  whitelist_email_addresses: [
    { key: 'email', label: 'Email Address', type: 'email', required: true },
  ],
}

const PAGE_SIZE = 25

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? '✓' : '✗'
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 60) + '…'
  const s = String(val)
  return s.length > 60 ? s.substring(0, 60) + '…' : s
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (!user || error) { setAppState('unauthenticated'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .single()
      if (!profile?.is_superadmin) { setAppState('unauthorized'); setUserEmail(user.email!); return }
      setUserEmail(user.email!)
      setUserId(user.id)
      setAppState('dashboard')
    })
  }, [])

  const handleLogin = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (data.url) window.location.href = data.url
  }

  if (appState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <p style={{ fontWeight: '700', color: '#94a3b8', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Authenticating…</p>
      </div>
    )
  }

  if (appState === 'unauthenticated') {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '60px', borderRadius: '48px', textAlign: 'center', border: '3px solid #000', boxShadow: '20px 20px 0px #000', maxWidth: '420px' }}>
          <h1 style={{ color: '#000', marginBottom: '8px', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.07em', fontStyle: 'italic', textTransform: 'uppercase' }}>Auth Required</h1>
          <p style={{ color: '#000', fontSize: '0.75rem', marginBottom: '40px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5 }}>Terminal Connection: Restricted</p>
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '20px', backgroundColor: '#2563eb', color: 'white', border: '3px solid #000', borderRadius: '20px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 8px 0 #0044cc' }}
          >
            Initialize Admin Session
          </button>
        </div>
      </main>
    )
  }

  if (appState === 'unauthorized') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', border: '3px solid #ef4444', padding: '50px', borderRadius: '40px', boxShadow: '15px 15px 0 #ef4444' }}>
          <h1 style={{ color: '#ef4444', fontWeight: '900', fontSize: '2rem', textTransform: 'uppercase', fontStyle: 'italic' }}>Access Denied</h1>
          <p style={{ fontWeight: '700', marginTop: '10px' }}>User: {userEmail}</p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '20px' }}>You do not have the required SUPERADMIN permissions.</p>
        </div>
      </div>
    )
  }

  return <Dashboard userEmail={userEmail} userId={userId} />
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ userEmail, userId }: { userEmail: string; userId: string }) {
  const supabase = getSupabase()

  const [activeSection, setActiveSection] = useState<Section>('profiles')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const orderCol = COLUMNS[activeSection].includes('created_datetime_utc') ? 'created_datetime_utc' : 'id'

      const { data, error: fetchErr, count } = await supabase
        .from(activeSection)
        .select('*', { count: 'exact' })
        .range(from, to)
        .order(orderCol, { ascending: false })

      if (fetchErr) throw fetchErr
      setRows(data || [])
      setTotalCount(count || 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [activeSection, page])

  useEffect(() => {
    setPage(0)
    setRows([])
    setTotalCount(0)
    setError(null)
  }, [activeSection])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    const defaults: Record<string, unknown> = {}
    FORM_FIELDS[activeSection].forEach(f => { defaults[f.key] = f.type === 'checkbox' ? false : '' })
    setFormData(defaults)
    setFormMode('create')
    setEditingId(null)
    setFormError(null)
    setFormSuccess(null)
    setImageFile(null)
    setShowForm(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    const fields: Record<string, unknown> = {}
    FORM_FIELDS[activeSection].forEach(f => { fields[f.key] = row[f.key] ?? (f.type === 'checkbox' ? false : '') })
    setFormData(fields)
    setFormMode('edit')
    setEditingId(String(row.id))
    setFormError(null)
    setFormSuccess(null)
    setImageFile(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this row?')) return
    const { error: delErr } = await supabase.from(activeSection).delete().eq('id', id)
    if (delErr) { alert('Delete failed: ' + delErr.message); return }
    fetchData()
  }

  const handleFormSubmit = async () => {
    setFormError(null)
    setFormSuccess(null)
    const payload: Record<string, unknown> = { ...formData }

    if (activeSection === 'images' && imageFile) {
      setUploading(true)
      try {
        const ext = imageFile.name.split('.').pop()
        const path = `uploads/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('images').upload(path, imageFile)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
        payload.url = urlData.publicUrl
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : 'Upload failed')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    try {
      if (formMode === 'create') {
        const { error: insErr } = await supabase.from(activeSection).insert(payload)
        if (insErr) throw insErr
        setFormSuccess('Row created successfully!')
      } else {
        const { error: updErr } = await supabase.from(activeSection).update(payload).eq('id', editingId!)
        if (updErr) throw updErr
        setFormSuccess('Row updated successfully!')
      }
      fetchData()
      setTimeout(() => setShowForm(false), 800)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Operation failed')
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  // Use actual columns from returned data if available, otherwise fall back to config
  const columns = rows.length > 0
    ? Object.keys(rows[0]).filter(k => COLUMNS[activeSection].includes(k) || COLUMNS[activeSection].length === 0)
    : COLUMNS[activeSection]
  const canCreate = CAN_CREATE.includes(activeSection)
  const canUpdate = CAN_UPDATE.includes(activeSection)
  const canDelete = CAN_DELETE.includes(activeSection)
  const hasForm = FORM_FIELDS[activeSection].length > 0

  const S = {
    root: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Mono', monospace, sans-serif", backgroundColor: '#f8fafc', color: '#0f172a' } as React.CSSProperties,
    sidebar: { width: '220px', minWidth: '220px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column' as const, position: 'sticky' as const, top: 0, height: '100vh', overflowY: 'auto' as const },
    sidebarHeader: { padding: '28px 20px 20px', borderBottom: '1px solid #1e293b' },
    sidebarTitle: { fontSize: '1.1rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.04em', fontStyle: 'italic' as const, textTransform: 'uppercase' as const, margin: 0 },
    sidebarEmail: { fontSize: '10px', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' as const },
    navGroup: { padding: '16px 0 0' },
    navGroupLabel: { fontSize: '9px', fontWeight: '900', letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase' as const, padding: '0 20px 8px' },
    navItem: (active: boolean) => ({
      display: 'block', width: '100%', padding: '9px 20px', border: 'none', cursor: 'pointer',
      textAlign: 'left' as const, fontSize: '12px', fontWeight: '700', fontFamily: 'inherit',
      backgroundColor: active ? '#2563eb' : 'transparent',
      color: active ? '#fff' : '#94a3b8',
      borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
    }),
    main: { flex: 1, padding: '40px', overflowX: 'auto' as const },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
    pageTitle: { fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.05em', fontStyle: 'italic' as const, textTransform: 'uppercase' as const, margin: 0 },
    badge: { fontSize: '11px', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', fontWeight: '700', marginLeft: '12px' },
    btn: (variant: 'primary' | 'secondary' | 'danger' | 'ghost') => {
      const base = { padding: '8px 18px', border: '2px solid #000', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', fontFamily: 'inherit', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
      const v = { primary: { backgroundColor: '#2563eb', color: '#fff', borderColor: '#1d4ed8' }, secondary: { backgroundColor: '#fff', color: '#000', borderColor: '#000' }, danger: { backgroundColor: '#ef4444', color: '#fff', borderColor: '#dc2626' }, ghost: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1' } }
      return { ...base, ...v[variant] }
    },
    tableWrap: { backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
    th: { backgroundColor: '#f1f5f9', padding: '12px 14px', textAlign: 'left' as const, fontWeight: '900', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const },
    td: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', fontFamily: "'DM Mono', monospace", fontSize: '12px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, color: '#334155' },
    tdActions: { padding: '8px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '6px', alignItems: 'center' } as React.CSSProperties,
    pagination: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', fontSize: '12px', fontWeight: '700', color: '#64748b' },
    overlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { backgroundColor: '#fff', border: '3px solid #000', borderRadius: '24px', padding: '40px', width: '480px', maxWidth: '95vw', boxShadow: '10px 10px 0 #000', maxHeight: '85vh', overflowY: 'auto' as const },
    modalTitle: { fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.04em', fontStyle: 'italic' as const, textTransform: 'uppercase' as const, marginBottom: '28px' },
    fieldWrap: { marginBottom: '18px' },
    label: { display: 'block', fontSize: '10px', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#64748b', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' },
    textarea: { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' as const, minHeight: '90px', resize: 'vertical' as const, outline: 'none' },
    alertSuccess: { backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '16px' },
    alertError: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#991b1b', marginBottom: '16px' },
  }

  return (
    <div style={S.root}>
      <nav style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <h1 style={S.sidebarTitle}>Admin Domain</h1>
          <div style={S.sidebarEmail}>{userEmail}</div>
        </div>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={S.navGroup}>
            <div style={S.navGroupLabel}>{group.label}</div>
            {group.items.map(item => (
              <button key={item.key} style={S.navItem(activeSection === item.key)} onClick={() => setActiveSection(item.key as Section)}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main style={S.main}>
        <div style={S.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={S.pageTitle}>{activeSection.replace(/_/g, ' ')}</h2>
            {activeSection !== 'statistics' && !loading && <span style={S.badge}>{totalCount.toLocaleString()} rows</span>}
          </div>
          {canCreate && hasForm && <button style={S.btn('primary')} onClick={openCreate}>+ New Row</button>}
        </div>

        {activeSection === 'statistics' ? (
          <StatsDashboard />
        ) : (
          <>
        {error && <div style={{ ...S.alertError, marginBottom: '20px' }}>⚠ {error}</div>}

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {columns.map(col => <th key={col} style={S.th}>{col}</th>)}
                {(canUpdate || canDelete) && hasForm && <th style={{ ...S.th, width: '120px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} style={{ ...S.td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} style={{ ...S.td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No rows found.</td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {columns.map(col => (
                      <td key={col} style={S.td} title={String(row[col] ?? '')}>{formatCell(row[col])}</td>
                    ))}
                    {(canUpdate || canDelete) && hasForm && (
                      <td style={S.tdActions}>
                        {canUpdate && <button style={S.btn('ghost')} onClick={() => openEdit(row)}>Edit</button>}
                        {canDelete && <button style={S.btn('danger')} onClick={() => handleDelete(String(row.id))}>Del</button>}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={S.pagination}>
            <button style={S.btn('secondary')} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button style={S.btn('secondary')} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
            </span>
          </div>
        )}
          </>
        )}
      </main>

      {showForm && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={S.modal}>
            <h3 style={S.modalTitle}>{formMode === 'create' ? '+ New' : 'Edit'} {activeSection.replace(/_/g, ' ')}</h3>
            {formSuccess && <div style={S.alertSuccess}>✓ {formSuccess}</div>}
            {formError && <div style={S.alertError}>⚠ {formError}</div>}

            {activeSection === 'images' && (
              <div style={S.fieldWrap}>
                <label style={S.label}>Upload Image File (optional — overrides URL)</label>
                <input type="file" accept="image/*" style={{ ...S.input, padding: '8px' }} onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
            )}

            {FORM_FIELDS[activeSection].map(field => (
              <div key={field.key} style={S.fieldWrap}>
                <label style={S.label}>{field.label}{field.required && ' *'}</label>
                {field.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!formData[field.key]} onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                ) : field.type === 'textarea' ? (
                  <textarea style={S.textarea} value={String(formData[field.key] ?? '')} onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))} placeholder={field.label} />
                ) : (
                  <input type={field.type} style={S.input} value={String(formData[field.key] ?? '')} onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))} placeholder={field.label} />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button style={S.btn('primary')} onClick={handleFormSubmit} disabled={uploading}>
                {uploading ? 'Uploading…' : formMode === 'create' ? 'Create' : 'Save Changes'}
              </button>
              <button style={S.btn('secondary')} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── STATS DASHBOARD ─────────────────────────────────────────────────────────

function StatsDashboard() {
  const supabase = getSupabase()
  const [stats, setStats] = useState<{
    totalCaptions: number
    totalVotes: number
    totalProfiles: number
    totalImages: number
    totalRequests: number
    publicCaptions: number
    featuredCaptions: number
    topFlavors: { description: string; count: number }[]
    votesByFlavor: { description: string; votes: number }[]
    recentActivity: { date: string; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: totalCaptions },
          { count: totalProfiles },
          { count: totalImages },
          { count: totalRequests },
          { count: publicCaptions },
          { count: featuredCaptions },
          { data: captionScores },
          { data: flavorCounts },
        ] = await Promise.all([
          supabase.from('captions').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('images').select('*', { count: 'exact', head: true }),
          supabase.from('caption_requests').select('*', { count: 'exact', head: true }),
          supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_public', true),
          supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_featured', true),
          supabase.from('caption_scores').select('total_votes, display_text').order('total_votes', { ascending: false }).limit(10),
          supabase.from('captions').select('humor_flavor_id, humor_flavors(description)').limit(1000),
        ])

        // Aggregate caption counts by flavor
        const flavorMap: Record<string, { description: string; count: number }> = {}
        ;(flavorCounts || []).forEach((c: any) => {
          const desc = c.humor_flavors?.description || 'Unknown'
          const id = c.humor_flavor_id || 'unknown'
          if (!flavorMap[id]) flavorMap[id] = { description: desc, count: 0 }
          flavorMap[id].count++
        })
        const topFlavors = Object.values(flavorMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        const totalVotes = (captionScores || []).reduce((sum: number, s: any) => sum + (s.total_votes || 0), 0)
        const votesByFlavor = (captionScores || [])
          .slice(0, 6)
          .map((s: any) => ({ description: s.display_text?.substring(0, 30) + '…', votes: s.total_votes || 0 }))

        setStats({
          totalCaptions: totalCaptions || 0,
          totalVotes,
          totalProfiles: totalProfiles || 0,
          totalImages: totalImages || 0,
          totalRequests: totalRequests || 0,
          publicCaptions: publicCaptions || 0,
          featuredCaptions: featuredCaptions || 0,
          topFlavors,
          votesByFlavor,
          recentActivity: [],
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const card = (label: string, value: string | number, sub?: string) => (
    <div style={{ backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>{label}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.04em', color: '#0f172a' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>{sub}</div>}
    </div>
  )

  const maxBarVal = (arr: { count: number }[]) => Math.max(...arr.map(a => a.count), 1)
  const maxVoteVal = (arr: { votes: number }[]) => Math.max(...arr.map(a => a.votes), 1)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8', fontSize: '12px', fontWeight: '700', letterSpacing: '0.2em' }}>
      LOADING STATISTICS…
    </div>
  )

  if (!stats) return <div style={{ color: '#ef4444', padding: '20px' }}>Failed to load statistics.</div>

  const publicPct = stats.totalCaptions > 0 ? Math.round((stats.publicCaptions / stats.totalCaptions) * 100) : 0
  const avgVotesPerCaption = stats.totalCaptions > 0 ? (stats.totalVotes / stats.totalCaptions).toFixed(1) : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {card('Total Captions', stats.totalCaptions)}
        {card('Total Votes', stats.totalVotes, `avg ${avgVotesPerCaption} votes/caption`)}
        {card('Active Users', stats.totalProfiles)}
        {card('Images', stats.totalImages)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {card('Caption Requests', stats.totalRequests)}
        {card('Public Captions', stats.publicCaptions, `${publicPct}% of total`)}
        {card('Featured Captions', stats.featuredCaptions)}
      </div>

      {/* CAPTIONS BY HUMOR FLAVOR */}
      <div style={{ backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '20px' }}>
          Captions Generated by Humor Flavor
        </div>
        {stats.topFlavors.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>No flavor data available.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.topFlavors.map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>{f.description}</span>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#2563eb' }}>{f.count.toLocaleString()}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(f.count / maxBarVal(stats.topFlavors)) * 100}%`, backgroundColor: '#2563eb', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP RATED CAPTIONS */}
      <div style={{ backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '20px' }}>
          Top Rated Captions by Vote Score
        </div>
        {stats.votesByFlavor.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>No voting data available.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.votesByFlavor.map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', fontStyle: 'italic' }}>"{f.description}"</span>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#16a34a' }}>{f.votes} pts</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#f0fdf4', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(f.votes / maxVoteVal(stats.votesByFlavor)) * 100}%`, backgroundColor: '#16a34a', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PUBLIC VS PRIVATE PIE-STYLE */}
      <div style={{ backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '20px' }}>
          Caption Visibility Breakdown
        </div>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.8" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563eb" strokeWidth="3.8"
                strokeDasharray={`${publicPct} ${100 - publicPct}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              {publicPct}%
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb' }} />
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Public: {stats.publicCaptions.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f1f5f9' }} />
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Private: {(stats.totalCaptions - stats.publicCaptions).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fbbf24' }} />
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Featured: {stats.featuredCaptions.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
