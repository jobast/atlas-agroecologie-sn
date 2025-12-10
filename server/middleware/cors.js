const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5177',
      'https://node.creates.ngo',
      'https://geo.creates.ngo'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqué pour l'origine : ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

module.exports = cors(corsOptions);