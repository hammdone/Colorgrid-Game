import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'ColorGrid API is running' });
});

export { app };