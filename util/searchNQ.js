var elasticsearch = require('elasticsearch');
var AWS = require('aws-sdk');
const GA_DASHBOARD_BASEURL = "http://52.37.72.190:5601/app/kibana#/dashboard/";
const GA_DASHBOARD_TEMPLATE = "Ecommerce-Dashboard?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-1y,mode:quick,to:now))&_a=(filters:!(),options:(darkTheme:!t),panels:!((col:1,id:GrowthHacker_Rev-Count-by-Monthly-Aggregate,panelIndex:1,row:9,size_x:6,size_y:5,type:visualization),(col:7,id:GrowthHacker_UserCount-by-UserTypes,panelIndex:2,row:9,size_x:6,size_y:5,type:visualization),(col:1,id:GrowthHacker_Average-of..Weekly,panelIndex:4,row:1,size_x:12,size_y:4,type:visualization),(col:7,id:GrowthHacker_Traffic-Count-by-Monthly,panelIndex:5,row:14,size_x:6,size_y:4,type:visualization),(col:1,id:GrowthHacker_Acquisition-Traffic-By-Source-slash-Medium,panelIndex:6,row:5,size_x:12,size_y:4,type:visualization),(col:1,id:GrowthHacker_Someting-Wong,panelIndex:7,row:14,size_x:6,size_y:4,type:visualization),(col:7,id:GrowthHacker_Unique-Visitors-and-Product-Revenue-by-Source-slash-Medium,panelIndex:8,row:18,size_x:6,size_y:5,type:visualization),(col:1,id:GrowthHacker_Transactions-By-Source-Medium-Bars,panelIndex:9,row:23,size_x:12,size_y:5,type:visualization),(col:1,id:GrowthHacker_Transactions-By-Source-Medium,panelIndex:10,row:18,size_x:6,size_y:5,type:visualization),(col:1,id:GrowthHacker_Revenue-By-Source-slash-Medium-Bars,panelIndex:11,row:28,size_x:12,size_y:6,type:visualization),(col:1,id:GrowthHacker_Revenue-By-Channel-Grouping,panelIndex:12,row:34,size_x:7,size_y:5,type:visualization),(col:8,id:GrowthHacker_Top-10-products-by-revenue,panelIndex:13,row:34,size_x:5,size_y:5,type:visualization),(col:1,id:GrowthHacker_TimeLine-Sampling,panelIndex:14,row:39,size_x:12,size_y:4,type:visualization)),query:(query_string:(analyze_wildcard:!t,query:'*')),title:'Ecommerce%20Dashboard',uiState:(P-1:(vis:(legendOpen:!f)),P-10:(vis:(legendOpen:!f)),P-11:(vis:(legendOpen:!f)),P-12:(vis:(colors:(Revenue:%23EF843C),legendOpen:!f)),P-2:(vis:(legendOpen:!f)),P-3:(vis:(legendOpen:!t)),P-4:(spy:(mode:(fill:!f,name:!n)),vis:(legendOpen:!t)),P-5:(vis:(legendOpen:!f)),P-6:(spy:(mode:(fill:!f,name:!n))),P-7:(vis:(legendOpen:!f)),P-9:(vis:(legendOpen:!f))))";


var client = new elasticsearch.Client({
    hosts: [
        'http://52.37.72.190:9200'
        //'http://localhost:9200'
    ]
});


//This is a standalone application to re-enqueue 
//problematic GA accounts to enqueue to SQS manually
reEnqueueBrandsWithZeroAnalyticDatasets();


//this is a standlone application to re-index
//brands with records > 0 for ecommerce base type
//of dashboard along with the dash url set to the master account view
//reIndexWithDashtypeAndDashURL();




function reIndexWithDashtypeAndDashURL(){
    searchAll('brands', 'brand', function(response) {
        var hits = response.hits;  
        for (var i=0; i< hits.length; i++){
            var recordCount = hits[i]._source.account_record_lastrefresh;
            //console.log("PRE TINKER:" + JSON.stringify(hits[i]._source, null, 2));

            if (recordCount > 0){
                hits[i]._source.account_dashboard_types = ['eCommerce'];
                hits[i]._source.account_dashboard_url = GA_DASHBOARD_BASEURL + GA_DASHBOARD_TEMPLATE.replace( /\*/, 'accountId:%22' + hits[i]._id + "%22" );
                //console.log("POST TINKER:" + JSON.stringify(hits[i]._source, null, 2));
                index('brands','brand', hits[i]._source);
                //process.exit();
            }

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
            if (hits[i]._source.views) tetherEmail = hits[i]._source.views[0].view_tethered_user_email;
            console.log(" Brand " + hits[i]._source.account_name + ":" + hits[i]._source.account_id + " has analytic count of " + hits[i]._source.account_record_lastrefresh + " tethered by " + tetherEmail + " and ingestible status is: " + _isBrandIngestible);
            var recordCount = hits[i]._source.account_record_lastrefresh;
            
            if (hits[i]._source.views && recordCount == 0 && _isBrandIngestible) {// && (JSON.stringify(hits[i]).indexOf("All Website Data") > -1 || JSON.stringify(hits[i]).indexOf("All Mobile App Data") > -1 )){
                tetherEmail = hits[i]._source.views[0].view_tethered_user_email;

            if (tetherEmail.toString().trim() === 'info@hawkemedia.com'){ // || tetherEmail.toString().trim() === 'erik@hawkemedia.com') {
                console.log("N Q ing... : " + hits[i]._id);
                console.log("Brand is:" + JSON.stringify(hits[i], null, 2)); 
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
    };

    //console.log ( "MESSAGE:" + JSON.stringify( msg, null, 2));

    var sqsParams = {
        MessageBody: JSON.stringify(msg),
        QueueUrl: 'https://sqs.us-west-2.amazonaws.com/837567902566/GH-GAIngestQueue_LOCAL',
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

function isBrandIngestible(brand){
    var ingestible = false;
    var types = ["RAW All Web Site Data", "All Web Site Data", "All Mobile App Data", 
                "Default","Raw Data", "Default view", "All Website Data", "1 Master View"];
    if ( brand ){
        types.push(brand._source.account_name);
        var views = brand._source.views;
        if ( views ){
            // case of account name matching one of the view name
            for (i=0; i<views.length; i++){
                if (views.length == 1) return true;
                for (j=0; j<types.length; j++){
                    if (views[i].view_name.indexOf(types[j]) > -1 )
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