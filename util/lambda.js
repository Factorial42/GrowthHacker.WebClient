var elasticsearch = require('elasticsearch');
var AWS = require('aws-sdk');
var googleapis = require('googleapis');
var request = require('request');
var deasync = require('deasync');

const mongoose = require('mongoose');
const OAuth2 = googleapis.auth.OAuth2;

/**
 * Load environment variables for Mongo from .env file, 
 * where API keys and passwords are configured
 * and connect/validate its running
 */
dotenv.load({ path: './.env.example' });

//Ensure connection to DB for play
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', () => {
    console.log(' MongoDB connection established to ' +  process.env.MONGODB_URI + '!');
});
mongoose.connection.on('error', () => {
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});

/** 
* Connect To Elastic
* and Validate it's accessible
*/

if (ES.ping()){
  console.log('%s ElasticSearch error. Please make sure ' + process.env.ELASTICHOSTANDPORT + ' is running.', chalk.red('✗'));
  process.exit();
}else
  console.log('%s ElasticSearch connection established to ==> ' + process.env.ELASTICHOSTANDPORT + '!', chalk.green('✓'));



var client = new elasticsearch.Client({
    hosts: [
        'http://52.37.72.190:9200'
        //'http://localhost:9200'
    ]//,
    //apiVersion: '5.0'
});


/** Connect to Elastic to fetch all user tokens
* to refresh 
* A: New Brands tethered to the account
* B: Refresh all user brands per token(get new data sets since last run)
* B.2: Update all brand data counts for QA/Validation or reconciliation of records manually
*/

//Get Users Elastic Version
//GET /users
exports.getUsers {
    ES.searchAll('users', 'user', function(_docs) {
        console.log("Users are:" + JSON.stringify(_docs, null, 2));
        var docs = convertES2ModelSimple(_docs.hits);
        //console.log("Response is :" + JSON.stringify(docs, null, 2));
    });
};




function reEnqueueBrandsWithOnlyCountUpdatesSendMessage(hit){
            var tetherEmail;

    if (hit._source.views) 
        tetherEmail = hit._source.views[0].view_tethered_user_email;
            console.log(" Brand " + hit._source.account_name + ":" + hit._source.account_id + " has analytic count of " + hit._source.account_record_lastrefresh + " tethered by " + tetherEmail);

            if (hit._source.views && hit._source.account_oauthtoken && hit._source.account_refresh_oauthtoken) {

                console.log("Original oAuthT:" + hit._source.account_oauthtoken);
                console.log("Original refreshT:" + hit._source.account_refresh_oauthtoken);


                //get refreshed tokens
                refreshOauth(hit._source.account_oauthtoken, hit._source.account_refresh_oauthtoken, function(oauth2Client) {
                    //console.log("Refreshed oAuthT:" + JSON.stringify(responseTokenSet, null, 2));
                    hit._source.account_oauthtoken = oauth2Client.credentials.access_token;
                    hit._source.account_refresh_oauthtoken = oauth2Client.credentials.refresh_token;
                    console.log("Refreshed oAuthT:" + hit._source.account_oauthtoken);
                    console.log("Refreshed refreshT:" + hit._source.account_refresh_oauthtoken);
                    console.log("N Q ing... : " + hit._id);
                    console.log("Brand enqueued is:" + JSON.stringify(hit, null, 2));
                    sendSQSMessage(hit._source, function(response) {
                    console.log("Response from sendSQSMessage: " + JSON.stringify(response, null, 2));
                    });
                });
        }
}

function reEnqueueBrandsWithOnlyCountUpdates() {
    //Get all brands
    searchAll('brands', 'brand', function(response) {
        var hits = response.hits;
        console.log("reEnqueueBrandsWithOnlyCountUpdates:: size " + hits.length);
        for (var i = 0; i < hits.length; i++){
            (function(m){
                console.log("Iter is:: " + i);
                reEnqueueBrandsWithOnlyCountUpdatesSendMessage(hits[i]);                
            }(i));
        }
    });
}



//Query elastic for all brands,
//query analytics, and if no records found, 
//enqueue the brand for ingestion
function reEnqueueBrandsWithZeroAnalyticDatasets() {
    //Get all brands
    searchAll('brands', 'brand', function(response) {
        var hits = response.hits;
        var tetherEmail;
        var _isBrandIngestible;
        for (var i = 0; i < hits.length; i++) {
            _isBrandIngestible = isBrandIngestible(hits[i]);
            //console.log("reEnqueueBrandsWithZeroAnalyticDatasets::brand:" + JSON.stringify( hits[i]._source, null, 2));
            if (hits[i]._source.views) tetherEmail = hits[i]._source.views[0].view_tethered_user_email;
            console.log(" Brand " + hits[i]._source.account_name + ":" + hits[i]._source.account_id + " has analytic count of " + hits[i]._source.account_record_lastrefresh + " tethered by " + tetherEmail + " and ingestible status is: " + _isBrandIngestible);
            var recordCount = hits[i]._source.account_record_total;
            console.log("reEnqueueBrandsWithZeroAnalyticDatasets:: recordCount:" + recordCount);
            //process.exit();

            if (hits[i]._source.views && recordCount == 0 ) { //&& _isBrandIngestible) { // && (JSON.stringify(hits[i]).indexOf("All Website Data") > -1 || JSON.stringify(hits[i]).indexOf("All Mobile App Data") > -1 )){
                tetherEmail = hits[i]._source.views[0].view_tethered_user_email;

                if (tetherEmail.toString().trim() === 'info@hawkemedia.com') { // || tetherEmail.toString().trim() === 'erik@hawkemedia.com') {
                    console.log("N Q ing... : " + hits[i]._id);
                    //console.log("Brand is:" + JSON.stringify(hits[i], null, 2));
                    //console.log("isBrandIngestible: " + isBrandIngestible(hits[i]));
                    //process.exit();

                    sendSQSMessage(hits[i]._source, function(response) {
                        //console.log("Response from sendSQSMessage: " + JSON.stringify(response, null, 2));
                    });
                }
            }
        }
    });
}


function search(indexName, indexType, matchKey, matchValue, callback) {
    client.search({
        index: indexName,
        type: indexType,
        body: {
            query: {
                match: {
                    "account_id": matchValue
                }
            },
        }
    }, function(error, response, status) {
        if (error) {
            console.log("search error: " + error)
        } else {
            console.log("--- Response ---");
            console.log(response);
            console.log("--- Hits ---");
            response.hits.hits.forEach(function(hit) {
                console.log(hit);
            })
            callback(response.hits);
        }
    });
}

function index(indexName, indexType, object) {
    //console.log(JSON.stringify(object));
    client.index({
        index: indexName,
        id: object.account_id,
        type: indexType,
        body: object
    }, function(err, resp, status) {
        console.log(resp);
        console.log(status);
        if (err) {
            console.log(err);
        }
    });
}

function searchAll(indexName, indexType, callback) {
    client.search({
        index: indexName,
        type: indexType,
        size: 10000,
        body: {
            query: {
                match_all: {}
            },
        }
    }, function(error, response, status) {
        if (error) {
            console.log("search error: " + error)
        } else {
            //console.log("--- Response ---");
            //console.log(response);
            //console.log("--- Hits ---");
            response.hits.hits.forEach(function(hit) {
                // console.log(hit);
            })
            callback(response.hits);
        }
    });
}



function sendSQSMessage(_payload, callback) {
    AWS.config.update({
        accessKeyId: 'AKIAIBNZUA6GIOCYVDGQ',
        secretAccessKey: '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'
    });
    var sqs = new AWS.SQS({
        region: 'us-west-2'
    });
    var msg = {
        brand: _payload,
        startDate: '2005-01-01',
        endDate: 'today'
        ,justCounts: true
    };

    //console.log ( "MESSAGE:" + JSON.stringify( msg, null, 2));
    //process.exit();

    var sqsParams = {
        MessageBody: JSON.stringify(msg),
        QueueUrl: 'https://sqs.us-west-2.amazonaws.com/837567902566/GH-GAIngestQueue_PROD',
        MessageAttributes: {
            MessageType: {
                DataType: 'String',
                StringValue: 'GHBrandIngestType'
            }
        }
    };

    sqs.sendMessage(sqsParams, function(err, data) {
        if (err) {
            console.log('ERR', err);
            return callback(err);
        }

        //console.log(data);
        return callback(data);
    });
}

function isBrandIngestible(brand) {
    var ingestible = false;
    var types = ["RAW All Web Site Data", "All Web Site Data", "All Mobile App Data",
        "Default", "Raw Data", "Default view", "All Website Data", "1 Master View"
    ];
    if (brand) {
        types.push(brand._source.account_name);
        var views = brand._source.views;
        if (views) {
            // case of account name matching one of the view name
            for (i = 0; i < views.length; i++) {
                if (views.length == 1) return true;
                for (j = 0; j < types.length; j++) {
                    if (views[i].view_name.indexOf(types[j]) > -1)
                        return true;
                }
            }
        }
    }

    if (!ingestible)
        console.log(" Brand not ingestible:" + JSON.stringify(brand, null, 2));
    //process.exit();

    return ingestible;
}

function refreshOauth(accessToken, refreshToken, callback) {
    var oauth2Client = new OAuth2('686502966146-42artrbsiu82metst7r9n317p2bueq1n.apps.googleusercontent.com', 'GNUm2ai-CwlE4drmx8UoW0mI', 'http://localhost/auth/google/callback');
    oauth2Client.credentials = {
        access_token: accessToken,
        refresh_token: refreshToken,
    };

    // console.log("Old token set:" + JSON.stringify(oauth2Client, null, 2));

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
                //         console.log("New token set:" + JSON.stringify(oauth2Client));
                callback(oauth2Client);
            });
        } else {
            console.log("returning old & valid token");
            callback(oauth2Client);
        }
    });
}