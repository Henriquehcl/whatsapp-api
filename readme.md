# WhatsApp Business API Platform

API profissional para integração com WhatsApp Business Platform (Meta
Cloud API) construída com Node.js, TypeScript, MongoDB e Clean
Architecture.

------------------------------------------------------------------------

## 📋 Visão Geral

Esta plataforma oferece uma API REST completa para integração com
WhatsApp Business, permitindo envio e recebimento de mensagens,
gerenciamento de conversas e webhooks.

### ✨ Funcionalidades

-   ✅ Envio de mensagens (texto, templates, imagens, áudio, vídeo,
    documentos)
-   ✅ Recebimento de mensagens via webhook
-   ✅ Atualização de status (entregue, lida, falha)
-   ✅ Histórico completo de conversas
-   ✅ Multi-tenancy (múltiplos clientes)
-   ✅ Rate limiting
-   ✅ Autenticação JWT
-   ✅ Documentação Swagger interativa
-   ✅ Logs estruturados
-   ✅ Pronto para produção com Docker

------------------------------------------------------------------------

## 🏗️ Arquitetura

O projeto segue os princípios da Clean Architecture com separação clara
de responsabilidades:

src/ ├── main/ \# Configurações da aplicação, server, middlewares\
├── modules/ \# Módulos funcionais\
│ └── whatsapp/ \# Módulo WhatsApp\
│ ├── domain/ \# Entidades e regras de negócio\
│ ├── application/ \# Casos de uso e portas\
│ ├── infrastructure/ \# Implementações concretas (repositórios,
adapters)\
│ └── presentation/ \# Controllers, rotas, middlewares\
├── shared/ \# Código compartilhado (erros, logger, utils)\
└── docs/ \# Documentação Swagger

### 📊 Fluxo de Dados

1.  **Requisição HTTP** → Controller valida input e chama Use Case\
2.  **Use Case** → Orquestra entidades, repositórios e serviços
    externos\
3.  **Repositório** → Persiste dados no MongoDB\
4.  **Adapter** → Comunica com API da Meta\
5.  **Resposta** → Controller retorna resposta padronizada

------------------------------------------------------------------------

## 🚀 Começando

### Pré-requisitos

-   Node.js 18+
-   MongoDB 6+
-   Docker e Docker Compose (opcional)
-   Conta de desenvolvedor na Meta
-   Aplicativo WhatsApp Business configurado

### Instalação

``` bash
git clone https://github.com/seu-usuario/whatsapp-api.git
cd whatsapp-api
```

``` bash
npm install
```

``` bash
cp .env.example .env
# Edite .env com suas configurações
```

Inicie o MongoDB:

``` bash
docker-compose up -d mongodb
```

Execute a aplicação:

``` bash
npm run dev
```

Acesse a documentação:

http://localhost:3000/api-docs

------------------------------------------------------------------------

## 🐳 Docker

Execute toda a stack:

``` bash
docker-compose up -d
docker-compose logs -f api
docker-compose down
```

------------------------------------------------------------------------

## 🔧 Configuração do WhatsApp Meta

### 1. Criar Aplicativo

-   Acesse developers.facebook.com\
-   Crie um novo aplicativo do tipo "Business"\
-   Adicione o produto "WhatsApp"

### 2. Configurar API

No painel:

-   Phone Number ID\
-   Access Token permanente\
-   App Secret

### 3. Configurar Webhook

Callback URL:

https://seu-dominio.com/api/v1/webhook

Verify Token:

Mesmo valor de META_VERIFY_TOKEN no .env

### 4. Assinatura em Produção

Header:

x-hub-signature-256: sha256=...

------------------------------------------------------------------------

## 📡 Endpoints da API

### 📩 Mensagens

**POST /api/v1/messages**

``` json
{
  "type": "text",
  "to": "5511999999999",
  "content": {
    "body": "Olá! Como posso ajudar?",
    "preview_url": false
  }
}
```

**GET /api/v1/messages?page=1&limit=50&status=sent**

------------------------------------------------------------------------

### 💬 Conversas

**GET /api/v1/conversations/5511999999999?page=1&limit=50**

------------------------------------------------------------------------

### 🔁 Webhook

**GET /api/v1/webhook**\
**POST /api/v1/webhook**

------------------------------------------------------------------------

### ❤️ Health Check

**GET /health**

------------------------------------------------------------------------

## 🔒 Segurança

-   JWT obrigatório (exceto webhook)
-   Rate limit: 100 req/min por IP
-   Helmet configurado
-   CORS restrito
-   Validação de assinatura do webhook

------------------------------------------------------------------------

## 📊 Modelagem de Dados

### Messages

``` json
{
  "id": "UUID",
  "tenantId": "string",
  "conversationId": "UUID",
  "direction": "inbound|outbound",
  "type": "string",
  "status": "string",
  "from": "string",
  "to": "string",
  "content": {},
  "metaMessageId": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Conversations

``` json
{
  "id": "UUID",
  "tenantId": "string",
  "phoneNumber": "string",
  "contactName": "string",
  "status": "string",
  "unreadCount": 0,
  "lastMessage": {},
  "lastActivityAt": "Date",
  "createdAt": "Date"
}
```

------------------------------------------------------------------------

## 🧪 Testando com Postman

-   Importar collection
-   Configurar baseUrl
-   Gerar token
-   Enviar mensagem
-   Listar conversas

------------------------------------------------------------------------

## 🚢 Deploy

### Docker

``` bash
docker build -t whatsapp-api .
docker run -p 3000:3000 whatsapp-api
```

### PM2

``` bash
pm2 start dist/main/server.js --name whatsapp-api
pm2 monit
```

### Kubernetes

Arquivos disponíveis em /k8s

------------------------------------------------------------------------

## 📈 Evolução para SaaS Multi-tenant

O projeto já está preparado:

-   Campo tenantId em todos documentos
-   Filtro automático por tenant
-   JWT com tenantId
-   Rate limit por tenant (opcional)

### Próximos passos SaaS

-   Portal de gerenciamento
-   Faturamento por uso
-   Dashboard analytics
-   Configurações customizadas

------------------------------------------------------------------------

## 🛠️ Tecnologias

-   Node.js
-   TypeScript
-   Express
-   MongoDB
-   Mongoose
-   JWT
-   Winston
-   Swagger
-   Zod
-   Docker
-   Helmet
-   Express Rate Limit

------------------------------------------------------------------------

## 📝 Licença

MIT

------------------------------------------------------------------------

## 🤝 Suporte

Email: henriquehcl@hotmail.com\

------------------------------------------------------------------------

Desenvolvido com ❤️ para facilitar integrações com WhatsApp Business.
