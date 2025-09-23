require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const AppError = require('./utils/AppError');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const productAdminRoutes = require('./routes/admin/product.admin.routes');
const orderAdminRoutes = require('./routes/admin/order.admin.routes');
const userAdminRoutes = require('./routes/admin/user.admin.routes');
const couponAdminRoutes = require('./routes/admin/coupon.admin.routes'); 
const paymentMethodAdminRoutes = require('./routes/admin/paymentMethod.admin.routes'); 



const cors = require("cors");
const app = express();
connectDB();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Roteador principal
app.use(cors());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);


// Rotas de admin
app.use('/api/v1/admin/products', productAdminRoutes);
app.use('/api/v1/admin/orders', orderAdminRoutes);
app.use('/api/v1/admin/users', userAdminRoutes);
app.use('/api/v1/admin/coupons', couponAdminRoutes);
app.use('/api/v1/admin/payment-methods', paymentMethodAdminRoutes); 


// Rota de teste
app.get('/', (req, res) => {
  res.send('API Calvão de Cria está no ar!');
});

// Middleware de tratamento de erros GLOBAL
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
