const express = require('express');
const { getProducts } = require('../controllers/productController');

const router = express.Router();
router.get('/', (req, res, next) => {
  // Product inventory changes independently of the page bundle; don't reuse stale 304 responses.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  next();
}, getProducts);

module.exports = router;
