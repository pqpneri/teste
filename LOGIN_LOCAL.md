# Login local do sistema

O login funciona sem banco de dados. Usuários, senha criptografada e sessão ficam no armazenamento local do navegador/WebView do aparelho.

## Acesso inicial

- Usuário: `admin`
- Senha: `Unigames@2026`

Após entrar, use o botão **Senha** no cabeçalho para definir uma nova senha.

## Importante

Este método impede acesso casual ao sistema no aparelho, mas não substitui autenticação em servidor. Uma pessoa com acesso técnico ao armazenamento do APK/navegador pode apagar os dados locais ou manipular o código do site.

- Ao limpar os dados/cache do aplicativo, o login e os relatórios locais podem ser apagados.
- A opção “Manter conectado” usa `localStorage`.
- Sem essa opção, a sessão usa `sessionStorage`.
- A senha é armazenada como hash PBKDF2-SHA-256 com salt; a senha em texto puro não é salva.
