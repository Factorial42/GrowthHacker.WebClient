var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');

const ES = require('../util/es.js');
const API = require('../util/APIFacade.js');
const GA = require('../util/getGA.js');
const Brand = require('../models/Brand.js');

exports.getBrandByBrandId = (req, res) => {
    var brandId = req.params.brandId;
    ES.searchByBrandId('brands', 'brand', brandId, function(_doc) {
        //console.log ( "RAW RESPONSE" + JSON.stringify(_doc, null, 2));
        var brand = convertES2ModelSimple(_doc.hits);
        //console.log("brand.js::getBrandByBrandId" + JSON.stringify(brand, null, 2));
        res.render('brandDetail', {
            brand: brand[0]
        });
    });
};


exports.getAnalytics = (req, res) => {
    var brandId = req.params.brandId;
    ES.searchByBrandId('brands', 'brand', brandId, function(_doc) {
        //console.log ( "RAW RESPONSE" + JSON.stringify(_doc, null, 2));
        var brand = convertES2ModelSimple(_doc.hits);
        //console.log(JSON.stringify(brand, null, 2));
        res.render('analytics', {
            brand: brand[0]
        });
    });
};

//elastic version to retrieve all brands
exports.getBrands = (req, res) => {
    ES.searchAll('brands', 'brand', function(_docs) {
        var docs = convertES2Model(_docs.hits, "Brand");
        //console.log("Brands are:" + JSON.stringify(_docs,null, 2));
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
    ES.searchAll('brands', 'brand', function(_docs) {
        var brands = convertES2ModelSimple(_docs.hits);

        //for each brand call the GA API
        for (var i = 0; i < brands.length; i++) {
            console.log("Brand is:" + JSON.stringify(brands[i], null, 2));
            API.sendSQSMessage(brands[i], function(response) {
                //console.log ("Response from sendSQSMessage: " + JSON.stringify( response, null, 2));
            });
        }
        res.render('brands', {
            brands: brands
        });
    });
};


exports.getBrandReingest = (req, res) => {
    var brandId = req.params.brandId;
    console.log ( "Reingest/Enqueing ID: " + brandId);

    ES.searchByBrandId('brands', 'brand', brandId, function(_doc) {
        var brand = convertES2ModelSimple(_doc.hits)[0];
        console.log ( "Reingest/Enqueing Brand: " + brand.account_name);

        //Enqueue the brand for ingestion
        API.sendSQSMessage(brand, function(response) {
            console.log("Response from sendSQSMessage: " + JSON.stringify(response, null, 2));

            //console.log(JSON.stringify(brand, null, 2));
            req.flash('success', {
                msg: 'Brand ' + brand.account_name + ' has been scheduled for Re-ingestion!'
            });
            res.render('brandDetail', {
                brand: brand
            });
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
    console.log("Brand:" + brandId + " being updated");
    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    ES.searchByBrandId('brands', 'brand', brandId, function(_doc) {
        var brand = convertES2ModelSimple(_doc.hits)[0];
        brand.account_record_lastrefresh = req.body.account_record_lastrefresh.valueOf();
        brand.account_record_total = req.body.account_record_total.valueOf();
        
        var tempTags = new Array();
        if ( req.body.account_tags ){
            tempTags = req.body.account_tags.split(",");
            for (var i = 0; i < tempTags.length; i++) {
                tempTags[i] = tempTags[i].trim();
            }
        }
        brand.account_tags = tempTags;

         var tempDashTypes = new Array();
        if ( req.body.account_dashboard_types ){
            tempDashTypes = req.body.account_dashboard_types.split(",");
            for (var i = 0; i < tempDashTypes.length; i++) {
                tempDashTypes[i] = tempDashTypes[i].trim();
            }
           
        }
       
        brand.account_dashboard_types = tempDashTypes;
        brand.account_dashboard_url = req.body.account_dashboard_url;
        brand.account_tetherer_email = req.body.account_tetherer_email;

        console.log("Brand being updated with values:" + JSON.stringify(brand, null, 2));

        ES.index('brands', 'brand', brand);

        req.flash('success', {
            msg: 'Brand information has been updated!'
        });
        res.redirect('/brands');
    });
};

function convertES2ModelSimple(hits) {
    console.log("convertES2ModelSimple: hitCount " + hits.length);
    var brands = [];
        for (var i = 0; i < hits.length; i++) {
            brands.push(hits[i]._source);
            //console.log (JSON.stringify(hits[i]._source, null, 2))
        }
    return brands;
}

function convertES2Model(hits, indexName) {
    //console.log("convertES2Model: hitCount " + hits.length);
    var brands = [];
    for (var i = 0; i < hits.length; i++) {
        if (hits[i]._source.account_tags && hits[i]._source.account_tags.length > 2)
            hits[i]._source.account_tags.splice(2);
        brands.push(hits[i]._source);
        //console.log (JSON.stringify(hits[i]._source, null, 2))
    }
    return brands;
}