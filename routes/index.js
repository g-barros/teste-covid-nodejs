const express = require('express');

const IndexController = require('../controllers/IndexController');

const router = express.Router();

/* GET home page. */
router.get('/', IndexController.index);

module.exports = router;
