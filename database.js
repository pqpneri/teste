(() => {
  'use strict';

  const config = window.UNIGAMES_DATABASE_CONFIG || {};
  const state = { transfers: [], customers: [], profile: null, user: null, users: [] };
  let client = null;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function statusElement() { return document.getElementById('databaseStatus'); }
  function setStatus(type, text) {
    const el = statusElement();
    if (!el) return;
    el.className = `database-status ${type}`;
    const label = el.querySelector('b');
    if (label) label.textContent = text;
  }
  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }
  function requireClient() {
    if (!client) throw new Error('Banco de dados não configurado. Confira database-config.js.');
    return client;
  }
  function mapTransfer(row) {
    return { id: row.id, createdAt: row.created_at, origin: row.origin, destination: row.destination, reason: row.reason, transport: row.transport, products: row.products || [], message: row.message || '', createdBy: row.created_by, createdByName: row.created_by_name || '' };
  }
  function mapCustomer(row) {
    return { id: row.id, createdAt: row.created_at, code: row.code, name: row.customer_name, phone: row.phone, type: row.proposal_type, date: row.proposal_date, rawDate: row.proposal_date, store: row.store, channel: row.channel, service: row.service, notes: row.notes, products: row.products || [], total: Number(row.total || 0), action: row.action, createdBy: row.created_by, createdByName: row.created_by_name || '' };
  }
  function profileName() {
    return state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email || '';
  }
  async function sessionUser() {
    const { data, error } = await requireClient().auth.getUser();
    if (error) throw error;
    state.user = data.user || null;
    return state.user;
  }
  async function loadProfile() {
    if (!state.user) return null;
    const { data, error } = await requireClient().from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (error) throw error;
    state.profile = data || null;
    return state.profile;
  }
  async function loadAll() {
    setStatus('offline', 'Carregando banco');
    await sessionUser();
    if (!state.user) { state.transfers = []; state.customers = []; state.profile = null; return false; }
    const [t, c] = await Promise.all([
      requireClient().from('transfer_reports').select('*').order('created_at', { ascending: false }),
      requireClient().from('customer_reports').select('*').order('created_at', { ascending: false })
    ]);
    if (t.error) throw t.error;
    if (c.error) throw c.error;
    state.transfers = (t.data || []).map(mapTransfer);
    state.customers = (c.data || []).map(mapCustomer);
    await loadProfile();
    setStatus('online', 'Banco online');
    emit('unigames:data-updated', { transfers: state.transfers, customers: state.customers });
    emit('customerReportsUpdated');
    return true;
  }
  async function saveTransfer(report) {
    const user = state.user || await sessionUser();
    if (!user) throw new Error('Faça login para salvar.');
    const row = { id: report.id, created_at: report.createdAt, origin: report.origin, destination: report.destination, reason: report.reason, transport: report.transport, products: report.products || [], message: report.message || '', created_by: user.id, created_by_name: profileName() };
    const { data, error } = await requireClient().from('transfer_reports').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    const saved = mapTransfer(data);
    const i = state.transfers.findIndex(x => x.id === saved.id);
    if (i >= 0) state.transfers[i] = saved; else state.transfers.unshift(saved);
    emit('unigames:data-updated', { type: 'transfer', item: saved });
    return saved;
  }
  async function saveCustomer(report) {
    const user = state.user || await sessionUser();
    if (!user) throw new Error('Faça login para salvar.');
    const row = { id: report.id, created_at: report.createdAt, code: report.code, customer_name: report.name, phone: report.phone || '', proposal_type: report.type || 'Venda de produto', proposal_date: report.rawDate || null, store: report.store || '', channel: report.channel || '', service: report.service || '', notes: report.notes || '', products: report.products || [], total: Number(report.total || 0), action: report.action || 'generated', created_by: user.id, created_by_name: profileName() };
    const { data, error } = await requireClient().from('customer_reports').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    const saved = mapCustomer(data);
    const i = state.customers.findIndex(x => x.id === saved.id);
    if (i >= 0) state.customers[i] = saved; else state.customers.unshift(saved);
    emit('customerReportsUpdated', saved);
    return saved;
  }
  async function deleteTransfer(id) {
    const { error } = await requireClient().from('transfer_reports').delete().eq('id', id);
    if (error) throw error;
    state.transfers = state.transfers.filter(x => x.id !== id);
    emit('unigames:data-updated', { type: 'transfer-delete', id });
  }
  async function deleteCustomer(id) {
    const { error } = await requireClient().from('customer_reports').delete().eq('id', id);
    if (error) throw error;
    state.customers = state.customers.filter(x => x.id !== id);
    emit('customerReportsUpdated', { deleted: id });
  }
  async function clearTransfers() {
    const ids = state.transfers.map(x => x.id);
    if (!ids.length) return;
    const { error } = await requireClient().from('transfer_reports').delete().in('id', ids);
    if (error) throw error;
    state.transfers = [];
    emit('unigames:data-updated', { type: 'transfer-clear' });
  }

  async function loadUsers() {
    const { data, error } = await requireClient().from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    state.users = data || [];
    return [...state.users];
  }
  async function updateUserProfile(id, changes) {
    const allowed = {
      full_name: String(changes.full_name || '').trim(),
      role: String(changes.role || 'transferencia'),
      is_active: Boolean(changes.is_active),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await requireClient().from('profiles').update(allowed).eq('id', id).select().single();
    if (error) throw error;
    const i = state.users.findIndex(x => x.id === id);
    if (i >= 0) state.users[i] = data; else state.users.unshift(data);
    emit('unigames:users-updated', data);
    return data;
  }

  window.UnigamesDB = {
    ready,
    get client() { return client; },
    get configured() { return Boolean(client); },
    getTransfers: () => [...state.transfers],
    getCustomers: () => [...state.customers],
    getProfile: () => state.profile,
    getUser: () => state.user,
    getUsers: () => [...state.users],
    loadAll, loadProfile, loadUsers, updateUserProfile, saveTransfer, saveCustomer, deleteTransfer, deleteCustomer, clearTransfers
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (!config.url || !config.anonKey || !window.supabase?.createClient) throw new Error('Configuração do Supabase ausente.');
      const sessionStorageAdapter = {
        getItem(key) {
          return localStorage.getItem(key) ?? sessionStorage.getItem(key);
        },
        setItem(key, value) {
          const remember = localStorage.getItem('unigames_remember_login') !== 'false';
          if (remember) {
            localStorage.setItem(key, value);
            sessionStorage.removeItem(key);
          } else {
            sessionStorage.setItem(key, value);
            localStorage.removeItem(key);
          }
        },
        removeItem(key) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      };
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: sessionStorageAdapter
        }
      });
      setStatus('offline', 'Conectando');
      resolveReady(client);
      emit('unigames:database-ready');
    } catch (error) {
      console.error(error);
      setStatus('error', 'Banco indisponível');
      resolveReady(null);
    }
  });
})();
