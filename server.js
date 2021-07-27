'use strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const shortId = require('shortid');
const validUrl = require('valid-url');
const cors = require('cors');
const dns = require('dns');
const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
const uri = process.env.DB_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
});

const {connection} = mongoose;

connection.once('open', () => {
  console.log("DB connection established!");
})

app.use('/public', express.static(process.cwd() + '/public'));

// Create Schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
})
const URL = mongoose.model("URL", urlSchema);

// Routes
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', function (req, res) {

  const { input_url } = req.body
  const urlCode = shortId.generate()

  if(validUrl.isHttpUri(input_url) || validUrl.isHttpsUri(input_url)) {
    dns.lookup(input_url, async function (err, val, family) {
      try {
        const urlExists = await URL.findOne({
          original_url: input_url
        })
        if (urlExists) {
          res.json({
            original_url: urlExists.original_url,
            short_url: urlExists.short_url
          })
        } else {
          const newURL = new URL({
            original_url: input_url,
            short_url: urlCode
          })
          await newURL.save();
          return res.json({
            original_url: newURL.original_url,
            short_url: newURL.short_url
          })
        }
      } catch (err) {
        console.error(err)
        res.status(500).json('Server error...')
      }
    })
  } else {
    return res.status(401).json({
      error: 'invalid url'
    })
  }
});


app.get('/api/shorturl/:short_url', async function (req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url
    })
    if (urlParams) {
      return res.redirect(urlParams.original_url)
    } else {
      return res.status(404).json('No URL found')
    }
  } catch (err) {
    console.log(err)
    res.status(500).json('Server error')
  }
})

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
})
