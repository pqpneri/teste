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
  function refreshHeaderGreeting(name = currentName, emphasize = false) {
    if (!name) return;
    currentName = name;
    const greeting = greetingFor(name);
    const el = $('topbarGreeting');
    if (el) {
      el.textContent = greeting;
      el.classList.remove('greeting-pop');
      requestAnimationFrame(() => el.classList.add('greeting-pop'));
    }
    const banner = $('loginGreetingBanner');
    if (banner) {
      banner.textContent = greeting;
      banner.classList.remove('show');
      requestAnimationFrame(() => banner.classList.add('show'));
      clearTimeout(refreshHeaderGreeting.timer);
      refreshHeaderGreeting.timer = setTimeout(() => banner.classList.remove('show'), emphasize ? 4200 : 2600);
    }
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

  async function resolveLoginEmail(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) throw new Error('Informe o usuário.');
    const { data, error } = await client.rpc('login_email_for_username', { login_username: normalized });
    if (error) throw error;
    return data || syntheticEmail(normalized);
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
    refreshHeaderGreeting(name, emphasizeGreeting);
    document.dispatchEvent(new CustomEvent('unigames:authenticated', { detail: { user, profile } }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    const username = normalizeUsername($('loginUsername').value);
    const password = $('loginPassword').value;
    const remember = $('rememberLogin')?.checked !== false;
    localStorage.setItem('unigames_remember_login', String(remember));
    const button = $('loginSubmit');
    setMessage('loginMessage', '', '');
    if (!username) return setMessage('loginMessage', 'Informe seu usuário.');
    button.disabled = true;
    button.querySelector('span').textContent = 'Entrando...';
    try {
      const email = await resolveLoginEmail(username);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await unlock(data.user, true);
      $('loginForm').reset();
    } catch (error) {
      const text = /Invalid login credentials/i.test(error.message) ? 'Usuário ou senha incorretos.' : `Não foi possível entrar: ${error.message}`;
      setMessage('loginMessage', text);
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = 'Entrar no sistema';
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const name = $('registerName').value.trim();
    const username = normalizeUsername($('registerUsername').value);
    const password = $('registerPassword').value;
    const confirm = $('registerPasswordConfirm').value;
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
      const email = syntheticEmail(username);
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
        setMessage('registerMessage', 'Conta criada. Para entrar imediatamente sem confirmação por e-mail, desative “Confirm email” no Supabase em Authentication → Providers → Email.', 'success');
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

  function switchAuth(mode) {
    const login = mode === 'login';
    $('loginForm').hidden = !login; $('registerForm').hidden = login;
    $('authTabLogin').classList.toggle('active', login); $('authTabRegister').classList.toggle('active', !login);
    $('loginCopyTitle').textContent = login ? 'Bem-vindo' : 'Crie seu acesso';
    $('loginCopyText').textContent = login ? 'Entre com seu usuário e senha.' : 'Crie um usuário para acessar o sistema.';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    client = await window.UnigamesDB.ready;
    if (!client) return showLogin('Banco de dados não configurado.');
    $('loginForm').addEventListener('submit', handleLogin);
    $('registerForm').addEventListener('submit', handleRegister);
    $('authTabLogin').onclick = () => switchAuth('login');
    $('authTabRegister').onclick = () => switchAuth('register');
    $('toggleLoginPassword').onclick = () => { const input = $('loginPassword'); input.type = input.type === 'password' ? 'text' : 'password'; };
    $('logoutButton').onclick = async () => { currentName = ''; await client.auth.signOut(); showLogin('Sessão encerrada.'); };
    $('changePasswordButton').onclick = () => { $('changePasswordForm').reset(); setMessage('changePasswordMessage', '', ''); $('changePasswordDialog').showModal(); };
    $('closeChangePassword').onclick = $('cancelChangePassword').onclick = () => $('changePasswordDialog').close();
    $('changePasswordForm').addEventListener('submit', handlePasswordChange);

    const rememberPreference = localStorage.getItem('unigames_remember_login');
    if ($('rememberLogin')) $('rememberLogin').checked = rememberPreference !== 'false';

    const { data } = await client.auth.getSession();
    if (data.session?.user) await unlock(data.session.user, true); else showLogin();
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') showLogin();
      if (event === 'SIGNED_IN' && session?.user) setTimeout(() => unlock(session.user, true), 0);
    });

    window.addEventListener('pageshow', () => { if (!document.body.classList.contains('auth-locked')) refreshHeaderGreeting(currentName, true); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { lastVisibleAt = Date.now(); return; }
      if (!document.body.classList.contains('auth-locked')) refreshHeaderGreeting(currentName, Date.now() - lastVisibleAt > 1500);
    });
  });
})();
