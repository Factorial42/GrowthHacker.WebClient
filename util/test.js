var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');
var request = require('request');

const Brand = require('../models/Brand.js');
const ES = require('../util/es.js');
const GA = require('../util/getGA.js');
const API = require('../util/APIFacade.js');
const mongoose = require('mongoose');
const OAuth2 = googleapis.auth.OAuth2;
const dotenv = require('dotenv');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: './.env.example' });

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
/*
refreshOauth2Token('ya29.Ci-SA0TlOyYMQ93wYs_5KBXDxA_3ls-iFfxVzRgmgx1nw3ry6gdzOr-wP_3VtQOvtw',
    '1/tHjMn6jlRz1mVoD36GvUsAr-rbmxRU5wg_GxjlYgTwg',
    function(response) {
        console.log(" Returned token set is:" + JSON.stringify(response));
        //queryCoreReportingApi('99659237', response);
    });
*/


// call sequential GA test
loadGASeqTest('1/q-253i8HO1vp48WwZXGvXO3ZBRVGV83OFBCRqN7oCFY','1/q-253i8HO1vp48WwZXGvXO3ZBRVGV83OFBCRqN7oCFY','info@hawkemedia.com');
loadGASeqTest('ya29.Ci-QA0noYmhlMK4O5nLUKrp8JqWs2k749z0rPYl5eSeSbF9KTdxHH80_Hi5uBfcfug','1/VkaH9Id8ML0tHFS0_aZsRDLHrHGSi-QjYc92idp8O0A','erik@hawkemedia.com')

//Test SQS messaging & sample POST
/*
Brand.findOne({
    account_id: '61002524'
}, function(err, doc) {
    if (!err) {
        var _doc = doc.toObject();
        delete _doc._id;
        _doc._id = doc.account_id;

        console.log("Posting to API POST :" + JSON.stringify( _doc, null, 2));
        //API.sendSQSMessage ( _doc, function(response){
        //    console.log ("Response from sendSQSMessage: " + JSON.stringify( response, null, 2));
        //});
        //API.syncAPIPost('http://localhost:8080/googleAnalytics/ingestData?startDate=1DaysAgo&endDate=today', _doc, function(response) {
        //    console.log("Response from syncAPIPost is:" + response);
        //});
    } else {
        throw err;
    }
});
*/



//util test functions

function refreshOauth2Token(accessToken, refreshToken, callback) {
    var oauth2Client = new OAuth2('686502966146-42artrbsiu82metst7r9n317p2bueq1n.apps.googleusercontent.com',
        'GNUm2ai-CwlE4drmx8UoW0mI', 'http://localhost/auth/google/callback');
    oauth2Client.credentials = {
        access_token: accessToken,
        refresh_token: refreshToken,
    };

    //console.log("Old token set:" + JSON.stringify(oauth2Client, null, 2));

    // check if token is valid
    tokenCheckURL = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + accessToken;
    request(tokenCheckURL, function(error, response, body) {
        if (error || response.statusCode != '200') {
            //case of refresh the token
            console.log("Token is being refreshed..");

            oauth2Client.refreshAccessToken(function(err, tokens) {
                // your access_token is now refreshed and stored in oauth2Client
                // store these new tokens in a safe place (e.g. database)
                if (err) console.log(err);
                //console.log("New token set:" + JSON.stringify(oauth2Client, null, 2));
                callback(oauth2Client);
            });
        } else {
            console.log("returning old & valid token");
            callback(oauth2Client);
        }

    });
}
//Given a set of tokens, load all brands
function loadGASeqTest(accessToken, refreshToken, email) {
    console.log ( "loadGASeqTest::AT:" + accessToken);
    console.log ( "loadGASeqTest::RT:" + refreshToken);
    refreshOauth2Token(accessToken, refreshToken,
    function(response) {
        console.log ( "loadGASeqTest::nAT:" + response.credentials.access_token);
        console.log ( "loadGASeqTest::nRT:" + response.credentials.refresh_token);
        console.log(" Returned token set is:" + JSON.stringify(response, null, 2));
        
        GA.getGA( response.credentials.access_token, response.credentials.refresh_token, email);
    });
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


function queryCoreReportingApi(profileId, oauth2Client) {
    console.log("Querying GA for profileID:" + profileId);
    // Query the Core Reporting API for the number sessions for
    // the past seven days.
    analytics.data.ga.get({
        'auth': oauth2Client,
        'ids': 'ga:' + profileId,
        'start-date': '7daysAgo',
        'end-date': 'today',
        'metrics': 'ga:sessions'
    }, function(error, response) {
        console.log(error);
        var formattedJson = JSON.stringify(response.result, null, 2);
        console.log(formattedJson);
    });
}