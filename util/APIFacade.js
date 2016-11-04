var request = require('request');
var async = require('async');

function ping(url,callback){
    request(url, function(error, response, body) {
        if (!error)
            return callback(response.statusCode);
        else console.log(error);
    });
}

//Sample GET
function syncAPIGet(url,callback) {
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log(body)
            return callback(body);
        } else console.log(error);
    });
}

//Sample POST
function syncAPIPost(url, Object,callback) {
    //console.log ("URL:" + url);
    //console.log("Object:" + JSON.stringify(Object));
 
    request.post({
        url:url, 
        json: Object},
    function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
            console.log(body);
            return callback(body);
        }else console.log('Somethin Wong! :: ' + response.statusCode);
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