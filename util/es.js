var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: process.env.ELASTICHOSTANDPORT,
});

function ping() {
    client.ping({
        // ping usually has a 3000ms timeout
        requestTimeout: Infinity,

        // undocumented params are appended to the query string
        hello: "elasticsearch!"
    }, function(error) {
        if (error) {
            console.trace('elasticsearch cluster is down!' + error);
        }
        if (!error) return true;
    });
}

function index(indexName, indexType, object) {
    client.index({
        index: indexName,
        id: Object.account_native_id,
        type: indexType,
        body: {
            object
        }
    }, function(err, resp, status) {
        console.log(resp);
        console.log(status);
        if (err) {
            console.log(err);
        }
    });
}

function deleteIndex(indexName, indexType, id) {
    client.delete({
        index: indexName,
        type: indexType,
        id: id
    }, function(error, response) {
        console.log(error);
        console.log(response);
    });
}

module.exports.deleteIndex = deleteIndex;
module.exports.ping = ping;
module.exports.index = index;