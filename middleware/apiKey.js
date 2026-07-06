function apiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(403).json({ error: 'API key inválida o ausente' });
  }
  next();
}

module.exports = apiKey;
