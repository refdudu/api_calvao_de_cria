import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Conectado com Sucesso!');
  } catch (error) {
    if (error instanceof Error) console.error('Erro ao conectar com o MongoDB:', error.message);
    // Encerra o processo da aplicação com status de falha
    process.exit(1);
  }
};

export default connectDB;
