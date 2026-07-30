# Banco de dados Supabase — Unigames

O site foi preparado para usar Supabase/PostgreSQL e continuar com cache local quando estiver sem internet.

## Configuração

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `SUPABASE_SETUP.sql`.
3. Abra `database-config.js`.
4. Preencha a URL do projeto e a chave `publishable` ou `anon`:

```js
window.UNIGAMES_DATABASE_CONFIG = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-CHAVE-PUBLICA'
};
```

5. Publique novamente os arquivos do site ou gere um novo APK WebView.

## Funcionamento

- Transferências e relatórios de clientes são salvos no banco.
- O site mantém uma cópia local para funcionar sem internet.
- Ao voltar a ter conexão, os registros são sincronizados.
- O indicador no cabeçalho mostra `Banco online`, `Banco local` ou `Falha no banco`.

## Segurança

O SQL incluído usa políticas abertas para permitir que o login local atual acesse o banco. Para uso com vários usuários e maior segurança, o próximo passo recomendado é trocar o login local pelo Supabase Auth e restringir as políticas por usuário.
