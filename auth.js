(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let client = null;
  let currentName = '';
  let lastVisibleAt = Date.now();

  function initials(value) {
    const parts = String(value || 'US').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'U') + (parts.length > 1 ? parts.at(-1)[0] : (parts[0]?.[1] || 'S'))).toUpperCase();
  }
  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._-]/g, '');
  }
  function syntheticEmail(username) { return `${normalizeUsername(username)}@accounts.unigames.app`; }
  function greetingFor(name) {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = String(name || '').trim().split(/\s+/)[0] || 'usuário';
    return `${period}, ${firstName}!`;
  }
  function refreshAccountGreeting(name = currentName) {
    if (!name) return;
    currentName = name;
    const greeting = greetingFor(name);
    const el = $('profileGreeting');
    if (el) el.textContent = greeting;
    const avatar = $('profileGreetingAvatar');
    if (avatar) avatar.textContent = initials(name);
  }
  function setMessage(id, text, type = 'error') {
    const el = $(id); if (!el) return;
    el.textContent = text;
    el.className = `${id.includes('login') ? 'login-message' : 'form-message'} ${type}`;
  }
  function showAppMessage(text, type = 'error', options = {}) {
    const el = $('appMessage'); if (!el) return;
    clearTimeout(showAppMessage.timer);
    el.textContent = text || '';
    el.className = `app-message ${type || ''}${text ? ' visible' : ''}`;
    if (text && !options.persistent) showAppMessage.timer = setTimeout(() => { el.textContent = ''; el.className = 'app-message'; }, options.duration || 5000);
  }
  window.showAppMessage = showAppMessage;

  function showLogin(message = '') {
    document.body.classList.add('auth-locked');
    $('loginScreen')?.classList.remove('is-hidden');
    if (message) setMessage('loginMessage', message);
  }
  function hideLogin() { document.body.classList.remove('auth-locked'); $('loginScreen')?.classList.add('is-hidden'); }

  async function resolveLoginEmail(identifier) {
    const raw = String(identifier || '').trim().toLowerCase();
    if (!raw) throw new Error('Informe seu e-mail ou usuário.');
    if (raw.includes('@')) return raw;
    const normalized = normalizeUsername(raw);
    const { data, error } = await client.rpc('login_email_for_username', { login_username: normalized });
    if (error) throw error;
    if (!data) throw new Error('LOGIN_NOT_FOUND');
    return data;
  }

  async function unlock(user, emphasizeGreeting = false) {
    await window.UnigamesDB.loadAll();
    const profile = window.UnigamesDB.getProfile();
    if (profile && profile.is_active === false) {
      await client.auth.signOut();
      return showLogin('Esta conta está desativada. Procure um administrador.');
    }
    const name = profile?.full_name || user.user_metadata?.full_name || profile?.username || 'Usuário';
    $('topbarUsername').textContent = name;
    $('topbarUserAvatar').textContent = initials(name);
    hideLogin();
    refreshAccountGreeting(name);
    document.dispatchEvent(new CustomEvent('unigames:authenticated', { detail: { user, profile } }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    const identifier = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    const remember = $('rememberLogin')?.checked !== false;
    localStorage.setItem('unigames_remember_login', String(remember));
    if (remember) {
      localStorage.setItem('unigames_keep_session', 'true');
      sessionStorage.removeItem('unigames_temporary_session');
    } else {
      localStorage.setItem('unigames_keep_session', 'false');
      sessionStorage.setItem('unigames_temporary_session', 'true');
    }
    const button = $('loginSubmit');
    setMessage('loginMessage', '', '');
    if (!identifier) return setMessage('loginMessage', 'Informe seu e-mail ou usuário.');
    button.disabled = true;
    button.querySelector('span').textContent = 'Entrando...';
    try {
      const email = await resolveLoginEmail(identifier);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await unlock(data.user, true);
      $('loginForm').reset();
    } catch (error) {
      const text = /Invalid login credentials|LOGIN_NOT_FOUND/i.test(error.message) ? 'E-mail, usuário ou senha incorretos.' : `Não foi possível entrar: ${error.message}`;
      setMessage('loginMessage', text);
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = 'Entrar no sistema';
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const name = $('registerName').value.trim();
    const email = $('registerEmail').value.trim().toLowerCase();
    const username = normalizeUsername($('registerUsername').value);
    const password = $('registerPassword').value;
    const confirm = $('registerPasswordConfirm').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage('registerMessage', 'Informe um e-mail válido.');
    if (username.length < 3) return setMessage('registerMessage', 'O usuário deve ter pelo menos 3 caracteres.');
    if (!/^[a-z0-9._-]+$/.test(username)) return setMessage('registerMessage', 'Use apenas letras, números, ponto, hífen ou sublinhado.');
    if (password.length < 8) return setMessage('registerMessage', 'A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirm) return setMessage('registerMessage', 'As senhas não conferem.');
    const button = $('registerSubmit'); button.disabled = true; button.textContent = 'Criando conta...';
    try {
      const { data: existing, error: lookupError } = await client.rpc('username_exists', { candidate_username: username });
      if (lookupError) {
        throw new Error('A função de cadastro ainda não foi instalada no banco. Execute o arquivo SUPABASE_SETUP_V16.sql.');
      }
      if (existing) throw new Error('Este usuário já está em uso. Escolha outro.');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, username, role: 'transferencia' } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('O Supabase não retornou o usuário criado. Confira as configurações de autenticação.');
      if (data.session) {
        await unlock(data.user, true);
        $('registerForm').reset();
      } else {
        setMessage('registerMessage', 'Conta criada com sucesso. Entre usando seu e-mail ou nome de usuário.', 'success');
        switchAuth('login');
        $('loginUsername').value = username;
      }
    } catch (error) {
      let message = String(error?.message || 'Erro desconhecido.');
      if (/Database error saving new user/i.test(message)) message = 'O banco ainda não está preparado para criar contas. Execute SUPABASE_SETUP_V16.sql no SQL Editor do Supabase.';
      else if (/User already registered/i.test(message)) message = 'Este usuário já está cadastrado.';
      else if (/Email signups are disabled/i.test(message)) message = 'O cadastro de contas está desativado no Supabase. Ative Email Signups em Authentication → Providers → Email.';
      else if (!message.startsWith('Este usuário') && !message.startsWith('O banco') && !message.startsWith('A função')) message = `Não foi possível criar a conta: ${message}`;
      setMessage('registerMessage', message);
    } finally { button.disabled = false; button.textContent = 'Criar conta'; }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const next = $('newPassword').value;
    const confirm = $('confirmPassword').value;
    if (next.length < 8) return setMessage('changePasswordMessage', 'A senha deve ter pelo menos 8 caracteres.');
    if (next !== confirm) return setMessage('changePasswordMessage', 'As senhas não conferem.');
    try {
      const { error } = await client.auth.updateUser({ password: next });
      if (error) throw error;
      setMessage('changePasswordMessage', 'Senha alterada com sucesso.', 'success');
      setTimeout(() => $('changePasswordDialog').close(), 800);
    } catch (error) { setMessage('changePasswordMessage', `Falha ao alterar: ${error.message}`); }
  }

  function openProfileDialog() {
    const profile = window.UnigamesDB.getProfile() || {};
    const user = window.UnigamesDB.getUser() || {};
    $('profileName').value = profile.full_name || user.user_metadata?.full_name || '';
    $('profileUsername').value = profile.username || user.user_metadata?.username || '';
    $('profileEmail').value = profile.email || user.email || '';
    refreshAccountGreeting(profile.full_name || profile.username || user.user_metadata?.full_name || 'Usuário');
    setMessage('profileMessage', '', '');
    $('profileDialog').showModal();
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    const button = $('profileSaveButton');
    button.disabled = true;
    button.textContent = 'Salvando...';
    setMessage('profileMessage', '', '');
    try {
      const profile = await window.UnigamesDB.updateOwnProfile({
        full_name: $('profileName').value,
        username: $('profileUsername').value,
        email: $('profileEmail').value
      });
      const name = profile.full_name || profile.username || 'Usuário';
      $('topbarUsername').textContent = name;
      $('topbarUserAvatar').textContent = initials(name);
      refreshAccountGreeting(name);
      setMessage('profileMessage', 'Dados atualizados com sucesso.', 'success');
      setTimeout(() => $('profileDialog').close(), 900);
    } catch (error) {
      let message = String(error?.message || 'Não foi possível atualizar seus dados.');
      if (/username_exists_for_other_user/i.test(message)) message = 'Execute o arquivo SUPABASE_SETUP_V21.sql no Supabase.';
      setMessage('profileMessage', message);
    } finally {
      button.disabled = false;
      button.textContent = 'Salvar alterações';
    }
  }

  function switchAuth(mode) {
    const login = mode === 'login';
    $('loginForm').hidden = !login; $('registerForm').hidden = login;
    $('authTabLogin').classList.toggle('active', login); $('authTabRegister').classList.toggle('active', !login);
    $('loginCopyTitle').textContent = login ? 'Bem-vindo' : 'Crie seu acesso';
    $('loginCopyText').textContent = login ? 'Entre com seu e-mail ou usuário e senha.' : 'Cadastre seu e-mail, usuário e senha para acessar o sistema.';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    client = await window.UnigamesDB.ready;
    if (!client) return showLogin('Banco de dados não configurado.');
    $('loginForm').addEventListener('submit', handleLogin);
    $('registerForm').addEventListener('submit', handleRegister);
    $('authTabLogin').onclick = () => switchAuth('login');
    $('authTabRegister').onclick = () => switchAuth('register');
    $('toggleLoginPassword').onclick = () => { const input = $('loginPassword'); input.type = input.type === 'password' ? 'text' : 'password'; };
    $('logoutButton').onclick = async () => { currentName = ''; sessionStorage.removeItem('unigames_temporary_session'); await client.auth.signOut(); showLogin('Sessão encerrada.'); };
    $('changePasswordButton').onclick = () => { $('changePasswordForm').reset(); setMessage('changePasswordMessage', '', ''); $('changePasswordDialog').showModal(); };
    $('editProfileButton').onclick = openProfileDialog;
    $('closeProfileDialog').onclick = $('cancelProfileDialog').onclick = () => $('profileDialog').close();
    $('profileForm').addEventListener('submit', handleProfileUpdate);
    $('closeChangePassword').onclick = $('cancelChangePassword').onclick = () => $('changePasswordDialog').close();
    $('changePasswordForm').addEventListener('submit', handlePasswordChange);

    const rememberPreference = localStorage.getItem('unigames_remember_login');
    if ($('rememberLogin')) $('rememberLogin').checked = rememberPreference !== 'false';

    const keepSession = localStorage.getItem('unigames_keep_session') !== 'false';
    const temporarySessionActive = sessionStorage.getItem('unigames_temporary_session') === 'true';
    const { data } = await client.auth.getSession();
    if (!keepSession && !temporarySessionActive && data.session) {
      await client.auth.signOut();
      showLogin();
    } else if (data.session?.user) {
      await unlock(data.session.user, true);
    } else {
      showLogin();
    }
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') showLogin();
      if (event === 'SIGNED_IN' && session?.user) setTimeout(() => unlock(session.user, true), 0);
    });

    window.addEventListener('pageshow', () => { if (!document.body.classList.contains('auth-locked')) refreshAccountGreeting(currentName); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { lastVisibleAt = Date.now(); return; }
      if (!document.body.classList.contains('auth-locked')) refreshAccountGreeting(currentName);
    });
  });
})();
