const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json()); 


let blockchain = [
  { index: 0, data: 'Genesis Block', timestamp: Date.now(), previousHash: '0', hash: 'genesis-hash' }
];
let pendingTransactions = [];
let peers = [];


app.get('/blocks', (req, res) => {
  try {
    res.json(blockchain);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});


app.post('/transaction', (req, res) => {
  const transaction = req.body;

 
  if (!transaction || !transaction.sender || !transaction.receiver || !transaction.amount) {
    return res.status(400).json({ error: 'Invalid transaction format' });
  }

  pendingTransactions.push(transaction);
  res.status(201).send('Transaction added');
});


function mineBlock() {
  return {
    index: blockchain.length,
    timestamp: Date.now(),
    data: pendingTransactions.splice(0),
    previousHash: blockchain[blockchain.length - 1].hash,
    hash: 'hash-' + Date.now() 
  };
}


app.post('/mine', async (req, res) => {
  try {
    const newBlock = mineBlock();
    blockchain.push(newBlock);


    for (const peer of peers) {
      try {
        await axios.post(`${peer}/receive-block`, newBlock);
      } catch (err) {
        console.error(`Failed to sync with peer ${peer}: ${err.message}`);
      }
    }

    res.status(201).json(newBlock);
  } catch (err) {
    res.status(500).json({ error: 'Mining failed' });
  }
});

app.post('/receive-block', (req, res) => {
  const block = req.body;
  if (block && block.index === blockchain.length) {
    blockchain.push(block);
    res.sendStatus(200);
  } else {
    res.status(400).json({ error: 'Invalid block or chain out of sync' });
  }
});


app.post('/add-peer', (req, res) => {
  const { peerUrl } = req.body;
  if (!peerUrl || peers.includes(peerUrl)) {
    return res.status(400).json({ error: 'Invalid or duplicate peer' });
  }
  peers.push(peerUrl);
  res.send('Peer added');
});


app.get('/peers', (req, res) => {
  res.json(peers);
});

app.listen(3000, () => {
  console.log('Blockchain node listening on port 3000');
});
