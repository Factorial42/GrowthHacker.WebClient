var googleapis = require('googleapis');
const OAuth2 = googleapis.auth.OAuth2;
const GA = require('../util/getGA.js');

//Setup oAuth
const oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost/auth/google/callback');

//GA Tokens
var accessToken = 'ya29.CjCMA-uZ5n_0EQHb3oNYzLHBnNdX-2Ejz3G2u7gDxHOvICWxw8CxAungb6juiux90Tw';
var refreshToken = '1/uGpTJbcDV4hk7KIOMInjURZkmGhQ5yD7JazHXygiyzZ-nTqV6v_-v7lNkYqpJEPN';
var userEmail = 'info@hawkemedia.com';

//Call getGA
function getGATest(){
	GA.getGA(accessToken, refreshToken, userEmail);
}

module.exports.getGATest = getGATest;