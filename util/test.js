const Brand = require('../models/Brand.js');
const ES = require('../util/es.js');
const API = require('../util/APIFacade.js');
const mongoose = require('mongoose');

//Ensure connection to DB for play
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/GrowthHacker');
mongoose.connection.on('connected', () => {
    console.log(' MongoDB connection established!');
});
mongoose.connection.on('error', () => {
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});


function esTest() {
    var brand = new Brand();
    brand.account_native_id = '2342342sdfasf';
    var jsBrand = brand.toObject();
    delete jsBrand["_id"];
    console.log("AFTER DEL:" + JSON.stringify(jsBrand));
    brand.account_name = ' Duh ';
    ES.index('brands', 'brand', jsBrand);
}

// Sample GET Test
/*
API.syncAPIGet('http://growthhacker.f42labs.com:9200/', function(response) {
    console.log(response);
});
*/


//Sample POST Test
Brand.findOne({
    account_id: '61002524'
}, function(err, doc) {
    if (!err) {
        //console.log(doc);
        var _doc = doc.toObject();
        delete _doc._id;
        _doc._id = doc.account_id;
        //console.log("AFTER ID manipulation:" + JSON.stringify(_doc)); 


        //console.log("Brand for ingest: " + doc);
        API.syncAPIPost('http://localhost:8080/googleAnalytics/ingestData?startDate=2DaysAgo&endDate=today', _doc, function(response) {
            console.log("Response from syncAPIPost is:" + response);
        });
    } else {
        throw err;
    }
});

process.exit(0);