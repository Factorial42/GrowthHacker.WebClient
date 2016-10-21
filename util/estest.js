const Brand = require('../models/Brand.js');
const ES = require('../util/es.js');

var brand = new Brand();
brand.account_native_id='2342342sdfasf';
brand.name = ' Duh ';
ES.index('brands','brand',brand);