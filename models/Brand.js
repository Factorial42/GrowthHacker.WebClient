//Mongo Stuff
const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  AccountID: String,
  AccountName: String,
  ViewName: String,
  ViewID: String,
  oAuthToken: String,
  oAuthUserEmail: String,
  tags: []
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;


//Elastic Stuff
var mongooseElastic     = require('mongoose')
  		 , mongoosastic = require('mongoosastic')
  		 , Schema       = mongoose.Schema
 
var User = new Schema({
    name: String
  , email: String
  , city: String
})
 
User.plugin(mongoosastic)