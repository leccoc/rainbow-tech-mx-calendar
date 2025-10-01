const express = require('express');
const PORT = process.env.PORT || 4040;

const app = express();
app.use(express.json());

const icalParser = require('./ical-parser.js');
app.use(icalParser);

const p5js = require('./p5.js');
app.use(p5js);

app.post('*', async (req, res) => {
  console.log(req.body);
  res.send('Hello post');
});

app.get('*', async (req, res) => {
  res.send('Hello post');
});

app.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log('Server listening on PORT', PORT);
});
