const Brand = require('../models/Brand.js');
const ES = require('../util/es.js');

var brand = new Brand();
brand.account_native_id='2342342sdfasf';
var jsBrand = brand.toObject();
delete jsBrand["_id"];
console.log("AFTER DEL:" + JSON.stringify(jsBrand) );
brand.account_name = ' Duh ';
ES.index('brands','brand',jsBrand);