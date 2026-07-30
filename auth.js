(() => {
  'use strict';

  const USERS_KEY = 'unigames_local_users_v1';
  const SESSION_KEY = 'unigames_auth_session_v1';
  const REMEMBER_KEY = 'unigames_auth_remember_v1';
  const DEFAULT_USER = 'admin';
  const DEFAULT_PASSWORD = 'Unigames@2026';
  const ITERATIONS = 120000;

  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  let currentSession = null;

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function randomSalt() {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return bytesToBase64(salt);
  }

  async function hashPassword(password, salt) {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: base64ToBytes(salt),
      iterations: ITERATIONS,
      hash: 'SHA-256'
    }, key, 256);
    return bytesToBase64(new Uint8Array(bits));
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function ensureDefaultUser() {
    const users = loadUsers();
    if (users.length) return;
    const salt = randomSalt();
    users.push({
      username: DEFAULT_USER,
      displayName: 'Administrador',
      salt,
      hash: await hashPassword(DEFAULT_PASSWORD, salt),
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }

  function getStoredSession() {
    const stores = [sessionStorage.getItem(SESSION_KEY), localStorage.getItem(REMEMBER_KEY)];
    for (const raw of stores) {
      if (!raw) continue;
      try {
        const session = JSON.parse(raw);
        if (session?.username && session?.token) return session;
      } catch {}
    }
    return null;
  }

  function createToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
  }

  function saveSession(username, remember) {
    const session = { username, token: createToken(), signedAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify(session));
    else localStorage.removeItem(REMEMBER_KEY);
    currentSession = session;
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    currentSession = null;
  }

  function initials(value) {
    const parts = String(value || 'AD').trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'A') + (parts.length > 1 ? parts.at(-1)[0] : (parts[0]?.[1] || 'D'));
  }

  function showLogin(message = '') {
    document.body.classList.add('auth-locked');
    $('loginScreen').classList.remove('is-hidden');
    $('loginMessage').textContent = message;
    $('loginMessage').className = 'login-message' + (message ? ' error' : '');
    setTimeout(() => $('loginUsername')?.focus(), 80);
  }

  function unlock(user) {
    document.body.classList.remove('auth-locked');
    $('loginScreen').classList.add('is-hidden');
    $('topbarUsername').textContent = user.displayName || user.username;
    $('topbarUserAvatar').textContent = initials(user.displayName || user.username).toUpperCase();
    document.dispatchEvent(new CustomEvent('unigames:authenticated', { detail: { username: user.username } }));
  }

  async function authenticate(username, password) {
    const normalized = String(username || '').trim().toLowerCase();
    const user = loadUsers().find(item => item.username.toLowerCase() === normalized);
    if (!user) return null;
    const candidate = await hashPassword(password, user.salt);
    return candidate === user.hash ? user : null;
  }

  async function restoreSession() {
    const session = getStoredSession();
    if (!session) return false;
    const user = loadUsers().find(item => item.username === session.username);
    if (!user) { clearSession(); return false; }
    currentSession = session;
    unlock(user);
    return true;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const username = $('loginUsername').value;
    const password = $('loginPassword').value;
    const button = $('loginSubmit');
    $('loginMessage').textContent = '';
    if (!username.trim() || !password) {
      $('loginMessage').textContent = 'Preencha usuário e senha.';
      $('loginMessage').className = 'login-message error';
      return;
    }
    button.disabled = true;
    button.querySelector('span').textContent = 'Verificando...';
    try {
      const user = await authenticate(username, password);
      if (!user) {
        $('loginMessage').textContent = 'Usuário ou senha incorretos.';
        $('loginMessage').className = 'login-message error';
        $('loginPassword').value = '';
        $('loginPassword').focus();
        return;
      }
      saveSession(user.username, $('rememberLogin').checked);
      unlock(user);
      $('loginForm').reset();
    } catch (error) {
      console.error(error);
      $('loginMessage').textContent = 'Não foi possível validar o acesso neste navegador.';
      $('loginMessage').className = 'login-message error';
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = 'Entrar no sistema';
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const message = $('changePasswordMessage');
    const current = $('currentPassword').value;
    const next = $('newPassword').value;
    const confirm = $('confirmPassword').value;
    message.textContent = '';
    message.className = 'form-message';
    if (next.length < 6) {
      message.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
      message.classList.add('error');
      return;
    }
    if (next !== confirm) {
      message.textContent = 'A confirmação da nova senha não confere.';
      message.classList.add('error');
      return;
    }
    const users = loadUsers();
    const index = users.findIndex(item => item.username === currentSession?.username);
    if (index < 0) return;
    const valid = await authenticate(users[index].username, current);
    if (!valid) {
      message.textContent = 'A senha atual está incorreta.';
      message.classList.add('error');
      return;
    }
    const salt = randomSalt();
    users[index].salt = salt;
    users[index].hash = await hashPassword(next, salt);
    users[index].updatedAt = new Date().toISOString();
    saveUsers(users);
    $('changePasswordForm').reset();
    message.textContent = 'Senha alterada com sucesso.';
    message.classList.add('success');
    setTimeout(() => $('changePasswordDialog').close(), 900);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await ensureDefaultUser();
    $('loginForm').addEventListener('submit', handleLogin);
    $('toggleLoginPassword').addEventListener('click', () => {
      const input = $('loginPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
    $('logoutButton').addEventListener('click', () => {
      clearSession();
      showLogin('Sessão encerrada com segurança.');
    });
    $('changePasswordButton').addEventListener('click', () => {
      $('changePasswordForm').reset();
      $('changePasswordMessage').textContent = '';
      $('changePasswordDialog').showModal();
    });
    $('closeChangePassword').addEventListener('click', () => $('changePasswordDialog').close());
    $('cancelChangePassword').addEventListener('click', () => $('changePasswordDialog').close());
    $('changePasswordForm').addEventListener('submit', handlePasswordChange);
    if (!await restoreSession()) showLogin();
  });
})();
