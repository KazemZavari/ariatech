
import dotenv from 'dotenv';
import app from './app';
import './config/db';

dotenv.config();

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {  
  console.log(`🚀 Server running on PORT: ${PORT}`);
});