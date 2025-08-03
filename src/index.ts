import express from 'express';
import mongoose from 'mongoose';
import queueRoutes from './routes/queueRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './docs/swagger-output.json';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(queueRoutes);

mongoose.connect('mongodb://localhost:27017/queue') // after localhost => mongo
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  })
  .catch(err => console.error('MongoDB connection error:', err));
