const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
    },
    email: {
      type: String,
      required: [true, 'O e-mail é obrigatório.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    cpf: {
      type: String,
      required: [true, 'O CPF é obrigatório.'],
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false }, // select: false para não retornar por padrão
    birthDate: { type: Date },
    phone: { type: String },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
