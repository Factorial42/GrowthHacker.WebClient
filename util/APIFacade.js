var request = require('request');
var async = require('async');
var deasync = require('deasync');
var AWS = require('aws-sdk');

var syncRequest = deasync(request.post);

function sendSQSMessage(_payload, callback) {
    AWS.config.update({
        accessKeyId: process.env.SQS_ACCESSKEY_ID,
        secretAccessKey: process.env.SQS_SECRETKEY
    });
    var sqs = new AWS.SQS({
        region: process.env.SQS_REGION
    });
    var msg = {
        brand: _payload,
        startDate: process.env.GA_BASELOAD_STARTDATE,
        endDate: process.env.GA_BASELOAD_ENDDATE//,
        //justCounts: true
    };

    //console.log ( "MESSAGE:" + JSON.stringify( msg, null, 2));

    var sqsParams = {
        MessageBody: JSON.stringify(msg),
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageAttributes: {
        MessageType: { DataType: 'String', StringValue: process.env.SQS_MESSAGETYPE}
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


function ping(url, callback) {
    request(url, function(error, response, body) {
        if (!error)
            return callback(response.statusCode);
        else console.log(error);
    });
}

//Sample GET
function syncAPIGet(url, callback) {
    request(url, function(error, response, body) {
        //console.log("syncAPIGet:" + body);
        //console.log("syncAPIGet:" + response);
        //console.log("syncAPIGet:" + response.statusCode);

        if (error) response.log("syncAPIGet: error " + error);
        if (!error && response.statusCode == 200) {
            return callback(body);
        } else {
            console.log("syncAPIGet - Error:" + error);
            return callback(body);
        }
    });
}

//Sample GET
function simpleAPIGet(url, response) {
    request(url, function(error, response, body) {
        //console.log("syncAPIGet:" + body);
        //console.log("syncAPIGet:" + response);
        //console.log("syncAPIGet:" + response.statusCode);

        if (error) response.log("simpleAPIGet: error " + error);
        if (!error && response.statusCode) {
            return callback(response);
        } else {
            console.log("simpleAPIGet - Error:" + error);
        }
    });
}

//Sample POST
function syncAPIPost(url, Object, callback) {
    //console.log ("URL:" + url);
    //console.log("syncAPIPost :: Object:" + JSON.stringify(Object));
    request.post({
            url: url,
            json: Object
        },
        function(error, response, body) {
            if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
                console.log(body);
                return callback(body);
            }
            if (error) console.log('Somethin Wong! :: ' + body + ":" + error);
        }
    );
}


function asyncAPICall() {
    async.parallel([
            /*
             * First external endpoint
             */
            function(callback) {
                var url = "http://growthhacker.f42labs.com:9200/";
                request(url, function(err, response, body) {
                    console.log("Call 1 made:");
                    // JSON body
                    if (err) {
                        console.log(err);
                        callback(true);
                        return;
                    }
                    obj = JSON.parse(body);
                    callback(false, obj);
                });
            },
            /*
             * Second external endpoint
             */
            function(callback) {
                var url = "http://localhost:9200/";
                console.log("Call 2 made:");
                wait(7000);
                request(url, function(err, response, body) {
                    // JSON body
                    if (err) {
                        console.log(err);
                        callback(true);
                        return;
                    }
                    obj = JSON.parse(body);
                    callback(false, obj);
                });
            },
        ],
        /*
         * Collate results
         */
        function(err, results) {
            if (err) {
                console.log(err);
                res.send(500, "Server Error");
                return;
            }
            console.log({
                api1: results[0],
                api2: results[1]
            });
        }
    );
};

function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms) {
        end = new Date().getTime();
    }
}

module.exports.ping = ping;
module.exports.asyncAPICall = asyncAPICall;
module.exports.syncAPIGet = syncAPIGet;
module.exports.syncAPIPost = syncAPIPost;
module.exports.sendSQSMessage = sendSQSMessage;
module.exports.simpleAPIGet = simpleAPIGet;