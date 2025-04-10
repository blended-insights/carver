import express from 'express';
import cors from 'cors';
import router from '@/routes';
import { corsOptions } from '@/config/cors.config';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

// Configure CORS
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Mount all routes
app.use(router);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
