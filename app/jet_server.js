"use strict";
const { config } = require('dotenv');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const port = 3000;
const app = express();
app.use(cors(), express.static('public'), bodyParser.json());

// Send application
app.get('*', (req, res) => {
  res.sendFile(path.resolve(`${__dirname}/public`, 'index.html'));
});

// Initiate server if in development
app.listen(port, err => {
  if (err) {
    console.log(err);
  } else {
    console.log(`Listening on port ${port}`);
  }
});