# Configuração da Meta WhatsApp Cloud API

Este guia mostra como obter e configurar as variáveis usadas pelo projeto:

```env
META_API_URL
META_ACCESS_TOKEN
META_PHONE_NUMBER_ID
META_VERIFY_TOKEN
META_APP_SECRET
```

## O que é obrigatório no sistema

- `META_API_URL`: obrigatório para o adapter enviar chamadas para a Graph API.
- `META_ACCESS_TOKEN`: obrigatório para autenticar envio de mensagens e leitura de mídia.
- `META_PHONE_NUMBER_ID`: obrigatório para o endpoint `/{PHONE_NUMBER_ID}/messages`.
- `META_VERIFY_TOKEN`: obrigatório para validação do `GET` de verificação de webhook.
- `META_APP_SECRET`:
  - obrigatório em produção (validação de assinatura `x-hub-signature-256`);
  - opcional em desenvolvimento.

## Antes de começar

- Conta no Meta for Developers.
- Business Manager com WhatsApp Business Account (WABA).
- Um número conectado ao produto WhatsApp no app da Meta.
- URL pública HTTPS para webhook (em desenvolvimento, pode usar tunnel como ngrok).

## 1) Criar app e adicionar produto WhatsApp

1. Acesse `https://developers.facebook.com/apps`.
2. Crie um app do tipo `Business`.
3. Dentro do app, adicione o produto `WhatsApp`.

## 2) Obter `META_PHONE_NUMBER_ID`

1. No app da Meta, vá em `WhatsApp > API Setup` (ou tela equivalente de configuração do produto).
2. Copie o `Phone Number ID` exibido para o número conectado.
3. Preencha no `.env`:

```env
META_PHONE_NUMBER_ID=123456789012345
```

## 3) Obter `META_ACCESS_TOKEN`

### Opção rápida (teste)

1. Na tela `WhatsApp > API Setup`, copie o token temporário.
2. Use apenas para desenvolvimento inicial.

### Opção recomendada (produção)

1. Acesse Business Settings em `https://business.facebook.com/settings`.
2. Vá em `Users > System users`.
3. Crie (ou selecione) um System User com permissão adequada.
4. Conceda acesso ao ativo de WhatsApp Business Account.
5. Gere token com permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Use o token gerado no `.env`:

```env
META_ACCESS_TOKEN=EAA...
```

## 4) Definir `META_VERIFY_TOKEN`

`META_VERIFY_TOKEN` é definido por você (não é fornecido automaticamente pela Meta).

1. Gere um valor forte aleatório.
2. Salve no `.env`.
3. Use exatamente o mesmo valor na configuração do webhook da Meta.

Exemplo:

```env
META_VERIFY_TOKEN=meta_webhook_verify_2026_xxxxxxxxx
```

## 5) Obter `META_APP_SECRET`

1. No app da Meta, abra `Settings > Basic`.
2. Copie o campo `App Secret`.
3. Salve no `.env`:

```env
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

Observação: no projeto, este valor é exigido em `NODE_ENV=production` para validar assinatura do webhook.

## 6) Definir `META_API_URL` (versão da Graph API)

Use a versão atual da Graph API na URL base.

```env
META_API_URL=https://graph.facebook.com/v25.0
```

Em `2026-03-02`, o changelog oficial da Graph API lista `v25.0` como versão mais recente.

## 7) Configurar webhook na Meta

1. No produto WhatsApp do app, abra a seção de Webhooks.
2. Configure:
   - `Callback URL`: `https://SEU_DOMINIO/api/v1/webhook`
   - `Verify token`: mesmo valor de `META_VERIFY_TOKEN`
3. Assine os campos necessários (ex.: `messages`, `message_template_status_update`, etc.).
4. Garanta que seu endpoint responda `200` no desafio de verificação.

## 8) Preenchimento final do `.env`

```env
# Meta WhatsApp Cloud API
META_API_URL=https://graph.facebook.com/v25.0
META_ACCESS_TOKEN=EAA...
META_PHONE_NUMBER_ID=123456789012345
META_VERIFY_TOKEN=meta_webhook_verify_2026_xxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

## 9) Checklist rápido de diagnóstico

- Erro 401/403 ao enviar mensagem: token inválido/expirado ou permissões faltando.
- Erro de webhook verify: `META_VERIFY_TOKEN` diferente entre Meta e API.
- Assinatura inválida em produção: `META_APP_SECRET` incorreto no `.env`.
- Erro de versão: atualizar `META_API_URL` para a versão ativa da Graph API.

## Referências oficiais

- Graph API Changelog: `https://developers.facebook.com/docs/graph-api/changelog`
- WhatsApp Cloud API - Get Started: `https://developers.facebook.com/docs/whatsapp/cloud-api/get-started`
- WhatsApp Cloud API - Messages Reference: `https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages`
- Meta Postman Workspace (official): `https://www.postman.com/meta/workspace/whatsapp-business-platform/documentation/13382743-84d01ff8-4251-4720-b454-af661f36acc2`
