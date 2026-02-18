const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// In-memory store for demo (use DB in real systems)
const txStore = {}; // txId -> { amount, orderId, status, createdAt, return_url, webhook_url }

// Shared secret for signing webhook payloads
const WEBHOOK_SECRET = 'supersecret_development_key'; // change if needed

function signPayload(payload) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// 1) Create a payment
app.post('/pay', (req, res) => {
  // expected: { amount, orderId, return_url, webhook_url, prefer = 'success'|'fail'|'random' }
  const { amount, orderId, return_url, webhook_url, prefer='success' } = req.body;
  if (!amount || !orderId || !return_url) {
    return res.status(400).json({ error: 'amount, orderId and return_url are required' });
  }

  const txId = uuidv4();
  txStore[txId] = {
    amount,
    orderId,
    status: 'PENDING',
    createdAt: Date.now(),
    return_url,
    webhook_url: webhook_url || null,
    prefer: prefer // developer can set default behaviour for demo
  };

  // Provide a simulated payment page (hosted by this server)
  const paymentPage = `${req.protocol}://${req.get('host')}/gateway/${txId}`;

  res.json({
    transactionId: txId,
    paymentUrl: paymentPage,
    status: 'PENDING'
  });
});

// 2) Simulated payment UI (GET)
app.get('/gateway/:tx', (req, res) => {
  const tx = req.params.tx;
  if (!txStore[tx]) return res.status(404).send('Transaction not found');
  // serve a simple HTML page
  res.sendFile(path.join(__dirname, 'public', 'gateway.html'));
});

// 3) Simulate clicking Pay on the gateway UI (POST)
app.post('/gateway/:tx/pay', (req, res) => {
  const tx = req.params.tx;
  const { action } = req.body; // 'pay' or 'fail' or 'random'
  const record = txStore[tx];
  if (!record) return res.status(404).json({ error: 'tx not found' });

  // decide result
  let result;
  if (action === 'fail') result = 'FAILURE';
  else if (action === 'success') result = 'SUCCESS';
  else if (action === 'random') result = Math.random() > 0.5 ? 'SUCCESS' : 'FAILURE';
  else { // default to prefer or success
    if (record.prefer === 'fail') result = 'FAILURE';
    else if (record.prefer === 'random') result = Math.random() > 0.5 ? 'SUCCESS' : 'FAILURE';
    else result = 'SUCCESS';
  }

  // update store
  record.status = result === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
  record.completedAt = Date.now();

  // send webhook if present (simulate async)
  if (record.webhook_url) {
    const payload = {
      transactionId: tx,
      orderId: record.orderId,
      status: record.status,
      amount: record.amount,
      timestamp: Date.now()
    };
    const signature = signPayload(payload);

    // fire webhook (best-effort; no external request lib required: use native https/http)
    const webhookUrl = new URL(record.webhook_url);
    const httpLib = webhookUrl.protocol === 'https:' ? require('https') : require('http');
    const reqOptions = {
      hostname: webhookUrl.hostname,
      port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
      path: webhookUrl.pathname + (webhookUrl.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': signature
      }
    };

    const req = httpLib.request(reqOptions, (resp) => {
      // ignore response body for demo
    });
    req.on('error', (err) => {
      console.error('Webhook delivery failed', err.message);
    });
    req.write(JSON.stringify(payload));
    req.end();
  }

  // redirect to return_url with query params
  const redirectUrl = new URL(record.return_url);
  redirectUrl.searchParams.set('tx', tx);
  redirectUrl.searchParams.set('status', record.status);
  res.json({ redirect: redirectUrl.toString() });
});

// 4) Status check
app.get('/status/:tx', (req, res) => {
  const tx = req.params.tx;
  const record = txStore[tx];
  if (!record) return res.status(404).json({ error: 'tx not found' });
  res.json({ transactionId: tx, status: record.status, orderId: record.orderId, amount: record.amount });
});

// 5) Admin: toggle or set status manually (for testing)
app.post('/admin/set-status/:tx', (req, res) => {
  const tx = req.params.tx;
  const { status } = req.body; // PENDING, SUCCESS, FAILED
  const record = txStore[tx];
  if (!record) return res.status(404).json({ error: 'tx not found' });
  record.status = status;
  res.json({ ok: true, tx, status: record.status });
});

// 6) Serve checkout client and result pages
app.get('/', (req, res) => res.redirect('/public/checkout.html'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Mock gateway running at http://localhost:${PORT}`));
