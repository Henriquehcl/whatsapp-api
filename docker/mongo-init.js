// Inicialização do MongoDB com usuários e índices
db = db.getSiblingDB('whatsapp-platform');

// Criar coleções com validação de schema
db.createCollection('tenants', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'apiKey', 'status'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Nome do tenant - obrigatório'
        },
        apiKey: {
          bsonType: 'string',
          description: 'Chave de API única - obrigatório'
        },
        status: {
          enum: ['active', 'inactive', 'suspended'],
          description: 'Status do tenant - obrigatório'
        },
        settings: {
          bsonType: 'object',
          properties: {
            webhookUrl: { bsonType: 'string' },
            rateLimit: { bsonType: 'int' }
          }
        }
      }
    }
  }
});

// Criar índices
db.tenants.createIndex({ apiKey: 1 }, { unique: true });
db.tenants.createIndex({ status: 1 });

// Inserir tenant padrão para desenvolvimento
db.tenants.insertOne({
  name: 'Default Tenant',
  apiKey: 'default_tenant_key',
  status: 'active',
  settings: {
    webhookUrl: 'https://example.com/webhook',
    rateLimit: 1000
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialized successfully');