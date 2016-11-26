var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
    hosts: [
        //'http://52.37.72.190:9200'
        'http://localhost:9200'
    ]
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
    //console.log(JSON.stringify(object));
    client.index({
        index: indexName,
        id: object.account_id,
        type: indexType,
        body:
            object
    }, function(err, resp, status) {
        console.log(resp);
        console.log(status);
        if (err) {
            console.log(err);
        }
    });
}

function indexUser( Object ) {
    var object = Object.toObject();
    delete object["_id"];
    //console.log(JSON.stringify(object, null, 2));
    client.index({
        index: 'users',
        id: object.email,
        type: 'user',
        body:
            object
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

function searchByBrandId(indexName, indexType, matchValue, callback) {
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
            //console.log("--- Response ---");
            //console.log(response);
            //console.log("--- Hits ---");
            //response.hits.hits.forEach(function(hit) {
            //    console.log(hit);
            //})
            callback(response.hits);
        }
    });
}

function searchAnalyticsByBrandId(indexName, indexType, matchValue, callback) {
    client.search({
        index: indexName,
        type: indexType,
        body: {
            query: {
                match: {
                    "accountId": matchValue
                }
            },
        }
    }, function(error, response, status) {
        if (error) {
            console.log("search error: " + error)
        } else {
            //console.log("--- Response ---");
            //console.log(response);
            //console.log("--- Hits ---");
            //response.hits.hits.forEach(function(hit) {
            //    console.log(hit);
            //})
            callback(response.hits);
        }
    });
}

function search(indexName, indexType, matchKey, matchValue){
client.search({  
  index: indexName,
  type: indexType,
  body: {
    query: {
      match: { matchKey: matchValue }
    },
  }
},function (error, response,status) {
    if (error){
      console.log("search error: "+error)
    }
    else {
      console.log("--- Response ---");
      console.log(response);
      console.log("--- Hits ---");
      response.hits.hits.forEach(function(hit){
        console.log(hit);
      })
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
                matchAll: {}
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

module.exports.deleteIndex = deleteIndex;
module.exports.ping = ping;
module.exports.index = index;
module.exports.indexUser = indexUser;
module.exports.search = search;
module.exports.searchAll = searchAll;
module.exports.searchByBrandId = searchByBrandId;
module.exports.searchAnalyticsByBrandId = searchAnalyticsByBrandId;