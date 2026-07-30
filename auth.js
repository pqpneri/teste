(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let client = null;

  function initials(value) {
    const parts = String(value || 'US').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'U') + (parts.length > 1 ? parts.at(-1)[0] : (parts[0]?.[1] || 'S'))).toUpperCase();
  }
  function setMessage(id, text, type = 'error') {
    const el = $(id); if (!el) return;
    el.textContent = text; el.className = `${id.includes('login') ? 'login-message' : 'form-message'} ${type}`;
  }
  function showLogin(message = '') {
    document.body.classList.add('auth-locked');
    $('loginScreen')?.classList.remove('is-hidden');
    if (message) setMessage('loginMessage', message);
  }
  function hideLogin() { document.body.classList.remove('auth-locked'); $('loginScreen')?.classList.add('is-hidden'); }
  async function unlock(user) {
    await window.UnigamesDB.loadAll();
    const profile = window.UnigamesDB.getProfile();
    const name = profile?.full_name || user.user_metadata?.full_name || user.email;
    $('topbarUsername').textContent = name;
    $('topbarUserAvatar').textContent = initials(name);
    hideLogin();
    document.dispatchEvent(new CustomEvent('unigames:authenticated', { detail: { user, profile } }));
  }
  async function handleLogin(event) {
    event.preventDefault();
    const email = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    const button = $('loginSubmit');
    setMessage('loginMessage', '', '');
    button.disabled = true;
    button.querySelector('span').textContent = 'Entrando...';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await unlock(data.user);
      $('loginForm').reset();
    } catch (error) {
      setMessage('loginMessage', error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message}`);
    } finally { button.disabled = false; button.querySelector('span').textContent = 'Entrar no sistema'; }
  }
  async function handleRegister(event) {
    event.preventDefault();
    const name = $('registerName').value.trim();
    const email = $('registerEmail').value.trim();
    const password = $('registerPassword').value;
    const confirm = $('registerPasswordConfirm').value;
    if (password.length < 8) return setMessage('registerMessage', 'A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirm) return setMessage('registerMessage', 'As senhas não conferem.');
    const button = $('registerSubmit'); button.disabled = true; button.textContent = 'Criando conta...';
    try {
      const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
      if (data.session && data.user) await unlock(data.user);
      else {
        setMessage('registerMessage', 'Conta criada. Confirme o e-mail para liberar o acesso.', 'success');
        $('registerForm').reset();
      }
    } catch (error) { setMessage('registerMessage', `Não foi possível criar a conta: ${error.message}`); }
    finally { button.disabled = false; button.textContent = 'Criar conta'; }
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
    $('loginCopyText').textContent = login ? 'Entre com seu e-mail e senha.' : 'Cadastre uma conta para acessar o sistema.';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    client = await window.UnigamesDB.ready;
    if (!client) return showLogin('Banco de dados não configurado.');
    $('loginForm').addEventListener('submit', handleLogin);
    $('registerForm').addEventListener('submit', handleRegister);
    $('authTabLogin').onclick = () => switchAuth('login');
    $('authTabRegister').onclick = () => switchAuth('register');
    $('toggleLoginPassword').onclick = () => { const input = $('loginPassword'); input.type = input.type === 'password' ? 'text' : 'password'; };
    $('logoutButton').onclick = async () => { await client.auth.signOut(); showLogin('Sessão encerrada.'); };
    $('changePasswordButton').onclick = () => { $('changePasswordForm').reset(); setMessage('changePasswordMessage', '', ''); $('changePasswordDialog').showModal(); };
    $('closeChangePassword').onclick = $('cancelChangePassword').onclick = () => $('changePasswordDialog').close();
    $('changePasswordForm').addEventListener('submit', handlePasswordChange);

    const { data } = await client.auth.getSession();
    if (data.session?.user) await unlock(data.session.user); else showLogin();
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') showLogin();
      if (event === 'SIGNED_IN' && session?.user) setTimeout(() => unlock(session.user), 0);
    });
  });
})();
