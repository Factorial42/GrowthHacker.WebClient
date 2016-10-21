var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');

const ES = require('../util/es.js');
const Brand = require('../models/Brand.js');
const OAuth2 = googleapis.auth.OAuth2;


//Setup oAuth for testing
const oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost:3000/auth/google/callback');

//GA Tokens
var gaToken;
var gaRefreshToken;
var prevAccount = new String();

function getGA(accessToken,refreshToken,userEmail) {
    if (accessToken) {
        gaToken = accessToken;
        gaRefreshToken = refreshToken;
        console.log("GetGA Request Params::GA Tokens:" + accessToken + " : " + refreshToken + "Tetherer Email:" + userEmail);

        //set/read token from DB/session clean up later
        oauth2Client.credentials = {
            //access_token: 'ya29.Ci9_Aws_eMxjJ_xM5zkrNlxnkPfNjr8QxKcY8diziZNRTEi5mj2JXh0gXthhhmRNHg',
            access_token: accessToken,
            refresh_token: refreshToken,
        };
        console.log(oauth2Client);


        analytics.management.accounts.list({
            'auth': oauth2Client
        }, function(error, response) {
            if (error) {
                console.log("The Access Token resulted in Error, could be insufficient permissions or No Google Accounts associated with grants");
                console.log(error);
            } else {
                handleAccounts(response,userEmail);
            }
        });
    }
}

//GA Crap
function handleAccounts(response,userEmail) {
    // Handles the response from the accounts list method.
    if (response.items && response.items.length) {
        console.log("*******************ACCOUNTS******************");
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

                //   for each account query for properties
                queryProperties(response.items[p].id, brand);
            }
        }
        console.log("*******************ACCOUNTS******************");

    } else {
        console.log('No GA Accounts found for this user.');
    }
}

function queryProperties(accountId, brand) {
    //console.log("Brand is:: " + JSON.stringify(brand));
    // Get a list of all the properties for the account.
    analytics.management.webproperties.list({
        'accountId': accountId,
        'auth': oauth2Client
    }, function(error, response) {
        if (error) {
            console.log(error);
        } else {
            handleProperties(response, brand);
        }
    });
}

function handleProperties(response, brand) {
    // Handles the response from the webproperties list method.
    if (response.items && response.items.length) {
        console.log("*******************PROPERTIES******************");

        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //     console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log("PropertyID :" + response.items[p].id + "\n");

                //set Brand relevant attribs
                brand.account_industry_vertical = response.items[p].industryVertical;
                brand.account_website_url = response.items[p].websiteUrl;
                brand.account_default_profile_id = response.items[p].defaultProfileId;
                brand.account_native_id = response.items[p].id;
                queryProfiles(response.items[p].accountId, response.items[p].id, brand);
            }
        }
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


function queryProfiles(accountId, propertyId, brand) {
    // Get a list of all Views (Profiles) for the first property
    // of the first Account.
    analytics.management.profiles.list({
        'accountId': accountId,
        'webPropertyId': propertyId,
        'auth': oauth2Client

    }, function(error, response) {
        if (error) {
            console.log("Eror in queryProfiles");
            console.log(error);
        } else {
            handleProfiles(response, brand,propertyId);
        }
    });
}


function handleProfiles(response, brand,propertyId) {
    // Handles the response from the profiles list method.
    if (response.items && response.items.length) {
        console.log("*******************PROFILES******************");
        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log("Profile ID :" + response.items[p].id + "\n");

                //Construct a view and push into Brand object
                brand.views.push({
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
                //finally save the brand
                if ( brand.account_native_id.valueOf() != prevAccount ){
                    prevAccount = brand.account_native_id;
                    brand.save(function(err) {
                    if (err) console.log('Error saving brand' + err);
                    else
                        ES.index('brands','brand',brand);
                });
            }
        }
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

module.exports.getGA = getGA;
