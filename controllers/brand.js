var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');

const Brand = require('../models/Brand.js');
const OAuth2 = googleapis.auth.OAuth2;

//Setup oAuth for testing
const oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost:3000/auth/google/callback');

//GA Tokens
var gaToken;
var gaRefreshToken;


exports.getBrandByBrandId = (req, res) => {
    var brandId = req.params.brandId;
    console.log("Brand being edited with " + brandId);
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