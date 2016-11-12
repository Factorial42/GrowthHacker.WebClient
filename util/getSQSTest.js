var Consumer = require('sqs-consumer');
var AWS = require('aws-sdk');
const API = require('../util/APIFacade.js');


AWS.config.update({
    accessKeyId: 'AKIAIBNZUA6GIOCYVDGQ',
    secretAccessKey: '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'
});

var app = Consumer.create({
    queueUrl: 'https://sqs.us-west-2.amazonaws.com/837567902566/GH-GAIngestQ',
    region: 'eu-west-2',
    batchSize: 1,
    handleMessage: function(message, done) {

        var msgBody = JSON.parse(message.Body);
        console.log(JSON.stringify ( msgBody.payload, null, 2 ));

            API.syncAPIPost('http://localhost:8080/googleAnalytics/ingestData?startDate=3650DaysAgo&endDate=today', msgBody.payload, function(response) {
                console.log("Response from syncAPIPost is:" + JSON.stringify(response, null, 2));
                if (response != 'undefined' && response.account_id) {
                    return done();
                }else throw new Error('API returned an undefined response!');
            });
    }
});

app.on('error', function(err) {
    console.log(err);
});

app.start();