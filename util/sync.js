var deasync = require('deasync');
var cp = require('child_process');
var exec = deasync(cp.exec);

//GA stuff
var googleapis = require('googleapis');
var analytics = googleapis.analytics('v3');
var accountList = deasync(analytics.management.accounts.list);
const OAuth2 = googleapis.auth.OAuth2;
const oauth2Client = new OAuth2(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'http://localhost/auth/google/callback');

oauth2Client.credentials = {
    //access_token: 'ya29.Ci9_Aws_eMxjJ_xM5zkrNlxnkPfNjr8QxKcY8diziZNRTEi5mj2JXh0gXthhhmRNHg',
    access_token: 'ya29.CjCKA6vKM46BZuKwBR-HFoiUceKfjbkBv5j02TmDSkYHaCfS2OaPRMHF7trJimy2yRc',
    refresh_token: '',
};
console.log(oauth2Client);

try {
    var response = accountList({
        'auth': oauth2Client,
        'quotaUser': 'xasdf'
    });
    if (response.items && response.items.length) {
        console.log("*******************ACCOUNTS******************");
        for (var p in response.items) {
            if (response.items.hasOwnProperty(p)) {
                //console.log(p + " , " + JSON.stringify(response.items[p]) + "\n");
                console.log(response.items[p].name + "\n");
           }
        }
        console.log("*******************ACCOUNTS******************");
    }
} catch (err) {
    console.log(err);
}

// output result of ls -la
try {
    console.log(exec('ls -la'));
} catch (err) {
    console.log(err);
}
// done is printed last, as supposed, with cp.exec wrapped in deasync; first without.
console.log('done');