(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ROLE_LABELS = { admin: 'Administrador', gestor: 'Gestor', operacional: 'Operacional', comercial: 'Comercial' };
  const ACCESS_LABELS = { transfers: 'Transferências', customers: 'Clientes', dashboard: 'Dashboard', history: 'Histórico', users: 'Usuários' };
  const ROLE_ACCESS = {
    admin: ['transfers','customers','dashboard','history','users'],
    gestor: ['transfers','customers','dashboard','history'],
    operacional: ['transfers','history'],
    comercial: ['customers','dashboard']
  };
  let users = [];
  let editingUser = null;

  function initials(name) {
    const parts = String(name || 'US').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'U') + (parts.length > 1 ? parts.at(-1)[0] : (parts[0]?.[1] || 'S'))).toUpperCase();
  }
  function escapeHtml(value='') { return String(value).replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch])); }

  function applyPermissions(profile) {
    const role = profile?.role || 'operacional';
    const allowed = ROLE_ACCESS[role] || ROLE_ACCESS.operacional;
    document.body.dataset.role = role;
    document.querySelectorAll('[data-permission]').forEach(el => {
      const ok = allowed.includes(el.dataset.permission);
      el.hidden = !ok;
      el.setAttribute('aria-hidden', String(!ok));
    });
    const activeButton = document.querySelector('.tab-button.active:not([hidden])');
    if (!activeButton) document.querySelector('.tab-button:not([hidden])')?.click();
    document.dispatchEvent(new CustomEvent('unigames:permissions-applied', { detail: { role, allowed } }));
  }

  function updateMetrics(filtered) {
    $('usersCountBadge').textContent = users.length;
    $('usersTotal').textContent = users.length;
    $('usersActive').textContent = users.filter(u => u.is_active !== false).length;
    $('usersAdmins').textContent = users.filter(u => u.role === 'admin').length;
    $('usersBlocked').textContent = users.filter(u => u.is_active === false).length;
    $('usersEmpty').hidden = filtered.length > 0;
  }

  function accessChips(role) {
    return (ROLE_ACCESS[role] || ROLE_ACCESS.operacional)
      .map(key => `<span>${escapeHtml(ACCESS_LABELS[key])}</span>`).join('');
  }

  function render() {
    const q = ($('usersSearch')?.value || '').trim().toLowerCase();
    const role = $('usersRoleFilter')?.value || '';
    const filtered = users.filter(u => (!q || `${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(q)) && (!role || u.role === role));
    updateMetrics(filtered);
    const list = $('usersList'); if (!list) return;
    list.innerHTML = '';
    filtered.forEach(user => {
      const roleKey = user.role || 'operacional';
      const card = document.createElement('article');
      card.className = 'user-card-v10';
      card.innerHTML = `
        <div class="user-main-v10">
          <div class="user-avatar">${escapeHtml(initials(user.full_name || user.email))}</div>
          <div class="user-info"><strong>${escapeHtml(user.full_name || 'Sem nome')}</strong><span>${escapeHtml(user.email || '')}</span><small>Criado em ${new Date(user.created_at).toLocaleDateString('pt-BR')}</small></div>
        </div>
        <span class="role-badge role-${roleKey}">${escapeHtml(ROLE_LABELS[roleKey] || roleKey)}</span>
        <div class="access-chips compact">${accessChips(roleKey)}</div>
        <span class="status-badge ${user.is_active === false ? 'blocked' : 'active'}">${user.is_active === false ? 'Bloqueada' : 'Ativa'}</span>
        <button class="edit-user-button" type="button">Editar</button>`;
      card.querySelector('.edit-user-button').addEventListener('click', () => openEditor(user));
      list.appendChild(card);
    });
  }

  function updateAccessPreview() {
    const role = $('editUserRole').value;
    $('editUserAccess').innerHTML = accessChips(role);
  }

  function openEditor(user) {
    editingUser = user;
    $('editUserId').value = user.id;
    $('editUserName').value = user.full_name || '';
    $('editUserEmail').value = user.email || '';
    $('editUserRole').value = user.role || 'operacional';
    $('editUserActive').checked = user.is_active !== false;
    $('userEditMessage').textContent = '';
    $('userEditMessage').className = 'form-message';
    updateAccessPreview();
    $('userEditDialog').showModal();
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!editingUser) return;
    const button = event.submitter;
    button.disabled = true;
    button.textContent = 'Salvando...';
    try {
      const updated = await window.UnigamesDB.updateUserProfile(editingUser.id, {
        full_name: $('editUserName').value,
        role: $('editUserRole').value,
        is_active: $('editUserActive').checked
      });
      Object.assign(editingUser, updated);
      $('userEditMessage').textContent = 'Conta atualizada com sucesso.';
      $('userEditMessage').className = 'form-message success';
      render();
      setTimeout(() => $('userEditDialog').close(), 650);
    } catch (error) {
      $('userEditMessage').textContent = `Não foi possível atualizar: ${error.message}`;
      $('userEditMessage').className = 'form-message error';
    } finally {
      button.disabled = false;
      button.textContent = 'Salvar alterações';
    }
  }

  async function loadUsers() {
    try { users = await window.UnigamesDB.loadUsers(); render(); }
    catch (error) {
      console.error(error);
      const list = $('usersList');
      if (list) list.innerHTML = `<div class="users-error">${escapeHtml(error.message)}</div>`;
    }
  }

  document.addEventListener('unigames:authenticated', async event => {
    const profile = event.detail.profile;
    applyPermissions(profile);
    if (profile?.is_active === false) {
      alert('Esta conta está bloqueada. Procure um administrador.');
      await window.UnigamesDB.client.auth.signOut();
      return;
    }
    if (profile?.role === 'admin') await loadUsers();
  });
  document.addEventListener('click', event => { if (event.target.closest('[data-tab="usersTab"]')) loadUsers(); });
  document.addEventListener('DOMContentLoaded', () => {
    $('usersSearch')?.addEventListener('input', render);
    $('usersRoleFilter')?.addEventListener('change', render);
    $('editUserRole')?.addEventListener('change', updateAccessPreview);
    $('userEditForm')?.addEventListener('submit', saveEditor);
    $('closeUserEditDialog')?.addEventListener('click', () => $('userEditDialog').close());
    $('cancelUserEdit')?.addEventListener('click', () => $('userEditDialog').close());
  });
  window.UnigamesRoles = { applyPermissions, ROLE_ACCESS, ROLE_LABELS };
})();
