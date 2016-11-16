var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');

const API = require('../util/APIFacade.js');
const GA = require('../util/getGA.js');
const Brand = require('../models/Brand.js');

exports.getBrandByBrandId = (req, res) => {
    var brandId = req.params.brandId;
    //console.log("Brand being edited with " + brandId);
    Brand.findOne({
        account_id: brandId
    }, function(err, docs) {
        //console.log(docs);
        //convert array to string
        res.render('brandDetail', {
            brand: docs
        });
    });
};

/**
 * GET /brands
 * List all Brands.
 */
exports.getBrands = (req, res) => {
    Brand.find((err, docs) => {
        res.render('brands', {
            brands: docs
        });
    });
};

/**
 * GET /loadGA
 * Load Brands for all Brands.
 */
exports.getLoadGA = (req, res) => {
    Brand.find((err, brands) => {
        //for each brand call the GA API
        for (var i = 0; i < brands.length; i++) {
            var esBrand = brands[i].toObject();
            delete esBrand["_id"];
            //console.log("Brand after:" + JSON.stringify(esBrand));
            esBrand._id = brands[i].account_id; //set the id back for API service call

            console.log("Calling API: " + JSON.stringify(esBrand));

            //API.syncAPIPost(process.env.API_SERVICE_ENDPOINT + '/googleAnalytics/ingestData?startDate=3650DaysAgo&endDate=today', esBrand, function(response) {
            //    console.log("Response from syncAPIPost is:" + JSON.stringify(response));
            
            API.sendSQSMessage ( esBrand, function(response){
                console.log ("Response from sendSQSMessage: " + JSON.stringify( response, null, 2));

                //update the brand with GA count info
                /*
                if (response != 'undefined' && response.account_id) {
                    Brand.findOne({
                        account_id: response.account_id
                    }, function(err, doc) {
                        if (!err) {
                            //set update values here & save the doc
                            doc.account_refresh_oauthtoken = response.account_refresh_oauthtoken;
                            doc.account_oauthtoken = response.account_oauthtoken;
                            doc.account_ingest_status = response.account_record_lastrefresh_status;
                            doc.account_record_lastrefresh = response.account_record_lastrefresh;
                            doc.account_record_total += response.account_record_lastrefresh;
                            //doc.account_tether_refresh_datetime = Date.now;
                            doc.save((err) => {
                                if (err) {
                                    console.log(err);
                                    return next(err);
                                }
                            });
                        }
                    });
                }*/
            });

        }

        res.render('brands', {
            brands: brands
        });
    });
};

/**
 * GET /brands
 * List all Views/Accounts etc.
 */
exports.getAnalytics = (req, res) => {
    var brandId = req.params.brandId;
    Brand.findOne({
        account_id: brandId
    }, function(err, doc) {
        res.render('analytics', {
            brand: doc
        });
    });
};



/**
 * POST /brands/:brandId/profile
 * Update brand information.
 */
exports.postUpdateBrand = (req, res, next) => {
    const errors = req.validationErrors();
    var brandId = req.params.brandId;
    console.log("Brand being updated with " + brandId);
    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    Brand.findOne({
        account_id: brandId
    }, function(err, brand) {
        if (err) {
            return next(err);
        }
        brand.account_record_lastrefresh = req.body.account_record_lastrefresh.valueOf();
        brand.account_record_total = req.body.account_record_total.valueOf();
        brand.account_tags = req.body.account_tags;
        brand.account_dashboard_types = req.body.account_dashboard_types;
        brand.account_dashboard_url = req.body.account_dashboard_url;
        brand.save((err) => {
            if (err) {
                console.log(err);
                return next(err);
            }
            req.flash('success', {
                msg: 'Brand information has been updated!'
            });
            res.redirect('/brands');
        });
    });
};