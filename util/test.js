var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');
const Brand = require('../models/Brand.js');
const ES = require('../util/es.js');
const GA = require('../util/getGA.js');
const API = require('../util/APIFacade.js');
const mongoose = require('mongoose');
const OAuth2 = googleapis.auth.OAuth2;


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



//Call stack

//run first to refresh token
refreshOauth2Token('ya29.CjCKAwEHnvCj5dijpHsPacWPmBz50jhUm99j4lUcnNtXE65WmIpd1r5jMfVwL3MJdBQ',
    '1/uGpTJbcDV4hk7KIOMInjURZkmGhQ5yD7JazHXygiyzZ-nTqV6v_-v7lNkYqpJEPN');

// call sequential GA test
//loadGASeqTest();




//util test functions

function refreshOauth2Token(accessToken, refreshToken) {
    const oauth2Client = new OAuth2('686502966146-42artrbsiu82metst7r9n317p2bueq1n.apps.googleusercontent.com',
        'GNUm2ai-CwlE4drmx8UoW0mI', 'http://localhost/auth/google/callback');
    oauth2Client.credentials = {
        //access_token: 'ya29.Ci9_Aws_eMxjJ_xM5zkrNlxnkPfNjr8QxKcY8diziZNRTEi5mj2JXh0gXthhhmRNHg',
        access_token: accessToken,
        refresh_token: refreshToken,
    };
    //console.log(oauth2Client);
    oauth2Client.refreshAccessToken(function(err, tokens) {
        // your access_token is now refreshed and stored in oauth2Client
        // store these new tokens in a safe place (e.g. database)
        console.log(oauth2Client);

    });
}

function loadGASeqTest() {
    GA.getGA('ya29.CjCKAxRtUw0YZqztp1XoljDZjn_uF-NVO4cqxqO2G0nc88j3Jed8ROaZpIVW-yUBmcA',
        '1/uGpTJbcDV4hk7KIOMInjURZkmGhQ5yD7JazHXygiyzZ-nTqV6v_-v7lNkYqpJEPN', 'info@hawkemedia.com');
}

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
/*
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
        API.syncAPIPost('http://localhost:8080/googleAnalytics/ingestData?startDate=1DaysAgo&endDate=today', _doc, function(response) {
            console.log("Response from syncAPIPost is:" + response);
        });
    } else {
        throw err;
    }
});
*/