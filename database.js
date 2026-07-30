(() => {
  'use strict';

  const TRANSFER_KEY = 'unigames_transfer_reports_v2';
  const CUSTOMER_KEY = 'unigames_customer_reports_v1';
  const config = window.UNIGAMES_DATABASE_CONFIG || {};
  const status = () => document.getElementById('databaseStatus');
  let client = null;

  function setStatus(type, text) {
    const element = status();
    if (!element) return;
    element.className = `database-status ${type}`;
    const label = element.querySelector('b');
    if (label) label.textContent = text;
  }

  function readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  function mergeById(localItems, remoteItems) {
    const map = new Map();
    [...localItems, ...remoteItems].forEach(item => {
      if (!item?.id) return;
      const current = map.get(item.id);
      if (!current || new Date(item.createdAt || item.created_at || 0) >= new Date(current.createdAt || current.created_at || 0)) {
        map.set(item.id, item);
      }
    });
    return [...map.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function transferToRow(report) {
    return {
      id: report.id,
      created_at: report.createdAt,
      origin: report.origin,
      destination: report.destination,
      reason: report.reason,
      transport: report.transport,
      products: report.products || [],
      message: report.message || ''
    };
  }

  function rowToTransfer(row) {
    return {
      id: row.id,
      createdAt: row.created_at,
      origin: row.origin,
      destination: row.destination,
      reason: row.reason,
      transport: row.transport,
      products: row.products || [],
      message: row.message || ''
    };
  }

  function customerToRow(report) {
    return {
      id: report.id,
      created_at: report.createdAt,
      code: report.code,
      customer_name: report.name,
      phone: report.phone,
      proposal_type: report.type,
      proposal_date: report.date || null,
      store: report.store,
      channel: report.channel,
      service: report.service || '',
      notes: report.notes || '',
      products: report.products || [],
      total: Number(report.total || 0),
      action: report.action || 'generated'
    };
  }

  function rowToCustomer(row) {
    return {
      id: row.id,
      createdAt: row.created_at,
      code: row.code,
      name: row.customer_name,
      phone: row.phone,
      type: row.proposal_type,
      date: row.proposal_date,
      store: row.store,
      channel: row.channel,
      service: row.service,
      notes: row.notes,
      products: row.products || [],
      total: Number(row.total || 0),
      action: row.action
    };
  }

  async function safe(action) {
    if (!client) return null;
    try {
      const result = await action();
      if (result?.error) throw result.error;
      setStatus('online', 'Banco online');
      return result;
    } catch (error) {
      console.error('Supabase:', error);
      setStatus('error', 'Falha no banco');
      return null;
    }
  }

  async function saveTransfer(report) {
    return safe(() => client.from('transfer_reports').upsert(transferToRow(report), { onConflict: 'id' }));
  }

  async function saveCustomer(report) {
    return safe(() => client.from('customer_reports').upsert(customerToRow(report), { onConflict: 'id' }));
  }

  async function deleteTransfer(id) {
    return safe(() => client.from('transfer_reports').delete().eq('id', id));
  }

  async function deleteCustomer(id) {
    return safe(() => client.from('customer_reports').delete().eq('id', id));
  }

  async function clearTransfers() {
    return safe(() => client.from('transfer_reports').delete().neq('id', ''));
  }

  async function syncAll() {
    if (!client) return false;
    setStatus('offline', 'Sincronizando');
    const [transferResult, customerResult] = await Promise.all([
      safe(() => client.from('transfer_reports').select('*').order('created_at', { ascending: false })),
      safe(() => client.from('customer_reports').select('*').order('created_at', { ascending: false }))
    ]);

    if (transferResult?.data) {
      const merged = mergeById(readLocal(TRANSFER_KEY), transferResult.data.map(rowToTransfer));
      localStorage.setItem(TRANSFER_KEY, JSON.stringify(merged));
      await Promise.all(merged.map(saveTransfer));
    }

    if (customerResult?.data) {
      const merged = mergeById(readLocal(CUSTOMER_KEY), customerResult.data.map(rowToCustomer));
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(merged));
      await Promise.all(merged.map(saveCustomer));
    }

    setStatus('online', 'Banco online');
    return true;
  }

  window.UnigamesDB = {
    get configured() { return Boolean(client); },
    saveTransfer,
    saveCustomer,
    deleteTransfer,
    deleteCustomer,
    clearTransfers,
    syncAll
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!config.url || !config.anonKey || !window.supabase?.createClient) {
      setStatus('offline', 'Banco local');
      return;
    }
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    setStatus('offline', 'Conectando');
    window.dispatchEvent(new CustomEvent('unigames:database-ready'));
  });
})();
