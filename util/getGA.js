var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');
var request = require('request');
var deasync = require('deasync');

const API = require('../util/APIFacade.js');
const ES = require('../util/es.js');
const Brand = require('../models/Brand.js');
const OAuth2 = googleapis.auth.OAuth2;


//setup deasync for the 3 calls we need for GA
var accountsList = deasync(analytics.management.accounts.list);
var webpropertiesList = deasync(analytics.management.webproperties.list);
var profilesList = deasync(analytics.management.profiles.list);

//GA Tokens
var gaToken;
var gaRefreshToken;
var prevAccount = new String();

function getGA(accessToken, refreshToken, userEmail) {
    if (accessToken) {
        gaToken = accessToken;
        gaRefreshToken = refreshToken;
        console.log("GetGA Request Params::GA Tokens:" + accessToken + " : " + refreshToken + "Tetherer Email:" + userEmail);

        //set/read token from DB/session clean up later
        var oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost/auth/google/callback');
        oauth2Client.credentials = {
            //access_token: 'ya29.Ci9_Aws_eMxjJ_xM5zkrNlxnkPfNjr8QxKcY8diziZNRTEi5mj2JXh0gXthhhmRNHg',
            access_token: accessToken,
            refresh_token: refreshToken,
        };
        //console.log(oauth2Client);
        //try refreshing the tokens(in case they are expired or invalid or revoked)
        //refreshOauth2Token(accessToken, refreshToken, function(responseTokenSet) {
        //    oauth2Client = responseTokenSet;

            try {
                var accountListsResponse = accountsList({
                    'auth': oauth2Client,
                    'quotaUser': userEmail
                });

                if (accountListsResponse != 'undefined' && accountListsResponse.items && accountListsResponse.items.length)
                    handleAccounts(oauth2Client, accountListsResponse, userEmail);
                else
                    console.log("Google Management API returned 0 Accounts");
            } catch (err) {
                console.log("The Access Token resulted in Error, could be insufficient permissions or No Google Accounts associated with grants");
                console.log(err);
            }
       // });

    }
}

//GA Crap
function handleAccounts(oauth2Client, response, userEmail) {
    // Handles the response from the accounts list method.
    if (response.items && response.items.length) {
        console.log("*******************ACCOUNTS::" + response.items.length + "******************");
        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log(response.items[p].name + "\n");

                //Create and save Brand Document
                var brand = new Brand();
                brand.account_name = response.items[p].name;
                brand.account_id = response.items[p].id;
                brand.account_source = response.items[p].kind;
                brand.account_created = response.items[p].created;
                brand.account_updated = response.items[p].updated;

                brand.account_tetherer_email = userEmail;
                brand.tether_refresh_datetime = null;
                brand.account_oauthtoken = gaToken;
                brand.account_refresh_oauthtoken = gaRefreshToken;

                //set the dashboard url
                brand.account_dashboard_url = process.env.GA_DASHBOARD_BASEURL + process.env.GA_DASHBOARD_TEMPLATE.replace( /\*/, 'accountId:%22' + brand.account_id + "%22" );

                //for each account query for properties
                queryProperties(oauth2Client, response.items[p].id, brand);
            }
        }
        console.log("*******************ACCOUNTS******************");
    } else {
        console.log('No GA Accounts found for this user.');
    }
}

function queryProperties(oauth2Client, accountId, brand) {
    //console.log("Brand is:: " + JSON.stringify(brand));
    // Get a list of all the properties for the account.

    try {
        //console.log("Getting properties for accountId:"+accountId+ " with auth:"+JSON.stringify(oauth2Client));
        var webpropertiesResponse = webpropertiesList({
            'accountId': accountId,
            'quotaUser': accountId,
            'auth': oauth2Client
        });
        if (webpropertiesResponse != 'undefined' && webpropertiesResponse.items && webpropertiesResponse.items.length)
            handleProperties(oauth2Client, webpropertiesResponse, brand);
        else
            console.log("Google API queryProperties returned empty results");

    } catch (err) {
        console.log(err);
    }
}

function handleProperties(oauth2Client, response, brand) {
    // Handles the response from the webproperties list method.
    if (response.items && response.items.length) {
        console.log("*******************PROPERTIES******************");

        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //     console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log("PropertyID :" + response.items[p].id + "\n");

                //set Brand relevant attribs
                brand.account_industry_vertical = response.items[p].industryVertical;
                brand.account_tags.push(response.items[p].industryVertical);
                brand.account_website_url = response.items[p].websiteUrl;
                brand.account_default_profile_id = response.items[p].defaultProfileId;
                brand = queryProfiles(oauth2Client, response.items[p].accountId, response.items[p].id, brand);
            }
        }

        // check if the brand is duplicate 
        doesBrandAccountExist(brand.account_id, function(isDupe) {
            console.log("doesBrandAccountExist evaluated to: " + isDupe);

            //finally save the brand if not a dupe
            if (!isDupe) {
                brand.save(function(err) {
                    if (err) console.log('Error saving brand' + err);
                    else {
                        //console.log ("Brand before:" + JSON.stringify(brand));
                        var esBrand = brand.toObject();
                        delete esBrand["_id"];
                        //esBrand._id = brand.account_id;
                        //console.log ("Brand after:" + JSON.stringify(esBrand)); 

                        //index  brand into elastic    -- TODO: Add a function/callback model for exception path                    
                        ES.index('brands', 'brand', esBrand);
                        //console.log("Indexing brand:"+ JSON.stringify(esBrand));

                        //start off the get GA process for the brand
                        esBrand._id = brand.account_id; //set the id back for API service call

                        console.log("Calling API: " + JSON.stringify(esBrand));

                        //Call java API to start ingesting GA
                        //API.syncAPIPost(process.env.API_SERVICE_ENDPOINT + '/googleAnalytics/ingestData?startDate=3650DaysAgo&endDate=today', esBrand, function(response) {
                        //    console.log("Response from syncAPIPost is:" + JSON.stringify(response));

                        //Alternatively enqueu via SQS to start ingesting GA
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
                });
            }
        });
        console.log("*******************PROPERTIES******************");

        // Get the first Google Analytics account
        //var firstAccountId = response.items[0].accountId;

        // Get the first property ID
        //var firstPropertyId = response.items[0].id;

        // Query for Views (Profiles).
        //queryProfiles(firstAccountId, firstPropertyId);
    } else {
        console.log('No properties found for this user.');
    }
}


function queryProfiles(oauth2Client, accountId, propertyId, brand) {
    // Get a list of all Views (Profiles) for the first property
    // of the first Account.

    try {
        var profilesListResponse = profilesList({
            'accountId': accountId,
            'quotaUser': accountId,
            'webPropertyId': propertyId,
            'auth': oauth2Client

        });
        if (profilesListResponse != 'undefined' && profilesListResponse.items && profilesListResponse.items.length) {
            brand = handleProfiles(profilesListResponse, brand, propertyId);
            return brand;
        } else
            console.log("Google API queryProfiles returned empty results");
    } catch (err) {
        console.log(err);
    }
}


function handleProfiles(response, brand, propertyId) {
    // Handles the response from the profiles list method.
    if (response.items && response.items.length) {
        console.log("*******************PROFILES******************");
        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log("Profile ID :" + response.items[p].id + "\n");

                //Construct a view and push into Brand object
                brand.views.push({
                    view_native_id: propertyId,
                    view_id: response.items[p].id,
                    view_name: response.items[p].name,
                    view_tethered_user_email: response.username,
                    view_currency: response.items[p].currency,
                    view_timezone: response.items[p].timezone,
                    view_channel_type: response.items[p].type,
                    view_ecommerce_tracking: response.items[p].eCommerceTracking,
                    view_enhanced_ecommerce_tracking: response.items[p].enhancedECommerceTracking
                });
            }
        }
        return brand;
        console.log("*******************PROFILES******************");


        // Get the first View (Profile) ID.
        //var firstProfileId = response.items[0].id;

        // Query the Core Reporting API.
        //queryCoreReportingApi(firstProfileId);
    } else {
        console.log('No views (profiles) found for this user.');
    }
}


function queryCoreReportingApi(profileId) {
    console.log("Querying GA for profileID:" + profileId);
    // Query the Core Reporting API for the number sessions for
    // the past seven days.
    analytics.data.ga.get({
        'auth': oauth2Client,
        'ids': 'ga:' + profileId,
        'start-date': '7daysAgo',
        'end-date': 'today',
        'metrics': 'ga:sessions'
    }, function(error, response) {
        console.log(error);
        var formattedJson = JSON.stringify(response.result, null, 2);
        console.log(formattedJson);
    });
}


function refreshOauth2Token(accessToken, refreshToken, callback) {
    var oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost/auth/google/callback');
    oauth2Client.credentials = {
        access_token: accessToken,
        refresh_token: refreshToken,
    };

    console.log("Old token set:" + JSON.stringify(oauth2Client));

    // check if token is valid
    tokenCheckURL = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + accessToken;
    request(tokenCheckURL, function(error, response, body) {
        if (error || response.statusCode != '200') {
            //case of refresh the token
            console.log("Token is being refreshed..");

            oauth2Client.refreshAccessToken(function(err, tokens) {
                // your access_token is now refreshed and stored in oauth2Client
                // store these new tokens in a safe place (e.g. database)
                if (err) console.log(err);
                console.log("New token set:" + JSON.stringify(oauth2Client));
                callback(oauth2Client);
            });
        } else {
            console.log("returning old & valid token");
            callback(oauth2Client);
        }

    });
}

function doesBrandAccountExist(brandId, callback) {
    //console.log("doesBrandAccountExist in getGA.js:: " + brandId);
    Brand.find((err, brands) => {
        if (err) {
            console.log(err);
            callback(err);
        }
        for (var i = 0; i < brands.length; i++) {
            //console.log("doesBrandAccountExist checking if:: " + brands[i].account_id + " == " + brandId);
            if (brands[i].account_id.toString() == brandId) {
                console.log("Duplicate brand found with id: " + brandId);
                return callback(true);
            }
        }
        console.log("Not a duplicate Brand!");
        return callback(false);
    });
}


module.exports.getGA = getGA;
module.exports.refreshOauth2Token = refreshOauth2Token;