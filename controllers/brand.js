var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');

const Brand = require('../models/Brand.js');

exports.getBrandByBrandId = (req, res) => {
    var brandId = req.params.brandId;
    console.log("Brand being edited with " + brandId);
    Brand.findOne({
        AccountID: brandId
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
exports.getGA = (req, res) => {
    if (req.user) {
        const OAuth2 = googleapis.auth.OAuth2;

        var oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost:3000/auth/google/callback');

        //set/read token from DB
        oauth2Client.credentials = {
            //access_token: 'ya29.Ci9_Aws_eMxjJ_xM5zkrNlxnkPfNjr8QxKcY8diziZNRTEi5mj2JXh0gXthhhmRNHg',
            access_token: 'ya29.CjCAA8JfhIEYybDEpWq75ewafvVN_9M4ZrmyTl8mI0ywy7cGHVW6ZQ2NboLcOrczgew',
        };
        console.log(oauth2Client);
        analytics.management.accounts.list({
            'auth': oauth2Client
        }, function(error, response) {
            if (error) {
                console.log("The Access Token resulted in Error, could be insufficient permissions or No Google Accounts associated with grants");
                console.log(error);
            } else
                console.log(response);
            if (response.items && response.items.length) {
                // Get the first Google Analytics account.
                var firstAccountId = response.items[0].id;
                console.log("Account id fetch is:" + firstAccountId);
                analytics.management.webproperties.list({
                    'auth': oauth2Client,
                    'accountId': firstAccountId
                });
            } else {
                console.log('No accounts found for this user.');
            }

        });
        res.render('helloanal');
    }
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
        AccountID: brandId
    }, function(err, brand) {
        if (err) {
            return next(err);
        }
        brand.oAuthUserEmail = req.body.useremail || '';
        brand.tags = req.body.tags;
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



//GA Crap

function handleProperties(response) {
    // Handles the response from the webproperties list method.
    if (response.items && response.items.length) {

        // Get the first Google Analytics account
        var firstAccountId = response.items[0].accountId;

        // Get the first property ID
        var firstPropertyId = response.items[0].id;

        // Query for Views (Profiles).
        queryProfiles(firstAccountId, firstPropertyId);
    } else {
        console.log('No properties found for this user.');
    }
}


function queryProfiles(accountId, propertyId) {
    // Get a list of all Views (Profiles) for the first property
    // of the first Account.
    analytics.management.profiles.list({
            'accountId': accountId,
            'webPropertyId': propertyId
        })
        .then(handleProfiles)
        .then(null, function(err) {
            // Log any errors.
            console.log("Error querying profiles");
            console.log(err);
        });
}


function handleProfiles(response) {
    // Handles the response from the profiles list method.
    if (response.items && response.items.length) {
        // Get the first View (Profile) ID.
        var firstProfileId = response.items[0].id;

        // Query the Core Reporting API.
        queryCoreReportingApi(firstProfileId);
    } else {
        console.log('No views (profiles) found for this user.');
    }
}


function queryCoreReportingApi(profileId) {
    // Query the Core Reporting API for the number sessions for
    // the past seven days.
    analytics.data.ga.get({
            'ids': 'ga:' + profileId,
            'start-date': '7daysAgo',
            'end-date': 'today',
            'metrics': 'ga:sessions'
        })
        .then(function(response) {
            var formattedJson = JSON.stringify(response.result, null, 2);
            document.getElementById('query-output').value = formattedJson;
        })
        .then(null, function(err) {
            // Log any errors.
            console.log(err);
        });
}