require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const AppError = require('./utils/AppError');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
connectDB();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Roteador principal
app.use('/api/v1/auth', authRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.send('API Calvão de Cria está no ar!');
});

// Middleware de tratamento de erros GLOBAL
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
