//Mongo Stuff

const mongoose = require('mongoose');
const brandSchema = new mongoose.Schema({
	'@timestamp': { type: Date, default: Date.now },
	account_name: String,
	account_id: { type: String, unique: true },
	account_source: String,
	account_created: Date,
	account_updated: Date,
  	account_oauthtoken: String,
  	account_refresh_oauthtoken: String,
  	account_website_url: String,
    account_industry_vertical: String,
    account_default_profile_id: String,
	account_tags: [],
	account_tetherer_email: String,
	account_record_total: { type: Number, default: 0 },
	account_record_lastrefresh: { type: Number, default: 0 },
	account_ingest_status: { type: String, default: 'Enqueued' }, //[Success, Failure for the base load as well as last run]
	account_tether_refresh_datetime: Date,
  account_dashboard_url: String,
  account_dashboard_types: [],
  	views: [{
    view_id: String,
    view_name: String,
        view_native_id: String,
   	view_tethered_user_email: String,
   	view_currency: String,
   	view_timezone: String,
   	view_channel_type: String,
   	view_ecommerce_tracking: Boolean,
   	view_enhanced_ecommerce_tracking: Boolean

  }]
},{timestamps: true });

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
