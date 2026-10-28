import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { compile } from './compiler/index.js';
import { variables } from './variables.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173'] })); // origen del frontend (Vite)
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Catálogo de variables para el selector del editor
app.get('/api/variables', (_req, res) =>
  res.json(Object.entries(variables).map(([key, v]) => ({ key, label: v.label, pii: v.pii })))
);

app.post('/api/generate', async (req, res, next) => {
  try {
    const { html, warnings } = await compile(req.body);
    res.json({ html, warnings });
  } catch (err) {
    next(err);
  }
});

// Manejo de errores: 400 para errores de entrada, 500 para el resto
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno' : err.message });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`API lista en http://localhost:${PORT}`);
  const n = (process.env.IMAGE_HOSTS ?? '').split(',').filter((h) => h.trim()).length;
  console.log(
    n
      ? `IMAGE_HOSTS: ${n} dominio(s) configurado(s)`
      : 'IMAGE_HOSTS vacío: se acepta cualquier dominio https (¿se cargó el .env? debe estar en la carpeta desde donde corres el servidor)'
  );
});
