require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRouter = require('./routes/auth');
const areasRouter = require('./routes/areas');
const transactionsRouter = require('./routes/transactions');
const guardRouter = require('./routes/guard');
const adminRouter = require('./routes/admin');
const violationsRouter = require('./routes/violations');
const announcementsRouter = require('./routes/announcements');
const reservationsRouter = require('./routes/reservations');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' })); // higher limit: parking/violation photos are base64

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TUPark API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/areas', areasRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/guard', guardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/reservations', reservationsRouter);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TUPark API listening on port ${PORT}`);
  });
});
