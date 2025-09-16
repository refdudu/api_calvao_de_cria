const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware "híbrido" que identifica o carrinho a ser usado.
 * Ele prioriza o token de autenticação (usuário logado).
 * Se não houver token, ele procura pelo header do carrinho de convidado.
 * O resultado é armazenado em req.cartIdentifier para ser usado pelo serviço.
 */
const cartIdentifierMiddleware = (req, res, next) => {
  const guestCartId = req.headers['x-guest-cart-id'];
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Prioridade 1: Usuário Autenticado
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.cartIdentifier = { userId: decoded.userId };
      // Anexa o usuário para ser usado em outras partes da aplicação
      req.user = { id: decoded.userId, role: decoded.role }; 
    } catch (err) {
      // Se o token for inválido/expirado, trata como convidado se houver guestCartId
      if (guestCartId) {
        req.cartIdentifier = { guestCartId };
      } else {
        req.cartIdentifier = {}; // Nenhum identificador, o serviço criará um novo guest cart
      }
    }
  } 
  // Prioridade 2: Usuário Convidado
  else if (guestCartId) {
    req.cartIdentifier = { guestCartId };
  } 
  // Nenhum identificador
  else {
    req.cartIdentifier = {};
  }

  next();
};

module.exports = { cartIdentifierMiddleware };