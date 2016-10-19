var elasticsearch = require('elasticsearch-odm');
elasticsearch.connect({host: 'localhost:9200', index:'brands',syncMapping: false});
var brandSchema = new elasticsearch.Schema({
AccountID: String,
  AccountName: String,
  ViewName: String,
  ViewID: String,
  oAuthToken: String,
  oAuthUserEmail: String,
  tags: String
});
var Brand = elasticsearch.model('Brand', brandSchema);
Brand.findById(1).then(function(results){
  console.log(results);
});
