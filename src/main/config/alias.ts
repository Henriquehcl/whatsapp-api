/**
 * Configuração de aliases de módulos para resolver imports com @/
 * Deve ser importado antes de qualquer outro módulo
 */

import path from 'path';
import moduleAlias = require('module-alias');

// CORREÇÃO: A API correta é addAlias (singular), não addAliases (plural)
moduleAlias.addAlias('@', path.join(__dirname, '../../'));

// Alternativa: se preferir usar a forma de objeto
// moduleAlias({ '@': path.join(__dirname, '../../') });

// Para desenvolvimento com ts-node, também precisamos registrar no path
if (process.env.NODE_ENV === 'development') {
  try {
    require('tsconfig-paths/register');
  } catch (error) {
    console.warn('⚠️ tsconfig-paths não instalado. Os aliases @/ podem não funcionar.');
  }
}

export default moduleAlias;
