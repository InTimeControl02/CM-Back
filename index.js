require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiKey = require('./middleware/apiKey');

const cablesRouter = require('./routes/cables');
const workgroupsRouter = require('./routes/workgroups');
const authRouter = require('./routes/auth');

const app = express();

// CORS — app LAN interna; las rutas ya están protegidas por API Key.
// Permite localhost y cualquier IP privada de la red local (clientes web Expo).
const LAN_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    // Sin origin = petición desde mobile/Postman/curl → permitir
    if (!origin || LAN_ORIGIN.test(origin)) return cb(null, true);
    cb(new Error(`Origen no permitido: ${origin}`));
  },
}));

app.use(express.json());

// Health check — sin API key (el frontend lo usa para verificar conectividad)
app.get('/health', (_, res) => res.json({ ok: true }));

// API Key obligatoria en TODAS las rutas
app.use(apiKey);
app.use('/auth', authRouter);
app.use('/cables', cablesRouter);
app.use('/workgroups', workgroupsRouter);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`CM API corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Desde celular: http://{IP-DE-ESTA-PC}:${PORT}`);
});

server.on('error', (err) => {
  console.error('Error en servidor:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
  process.exit(1);
});
