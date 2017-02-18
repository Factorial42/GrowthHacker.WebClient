const nodemailer = require('nodemailer');
var request = require('request');


sendEmailMessage();

function sendEmailMessage(){
// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'reddy@f42labs.com',
        pass: 'reddy@f42'
    }
});

var endPoint;
endPoint = process.env.API_SERVICE_ENDPOINT_MAILER;
if (endPoint == 'undefined' || endPoint == null){
    endPoint = 'http://35.163.245.245:8080/googleAnalytics/countsPastHours?hours=24';
}

var Thebody;
request(endPoint, function(error, response, body) {
    if (!error || response.statusCode == '200') {
        //console.log("Calling API for Stats...");
        //console.log("Body is: " + body);
        Thebody = body;
    } 

// setup email data with unicode symbols
let mailOptions = {
    from: '"F42 Admin 👻" <donotreply@f42labs.com>',
    to: 'mpreddy77@gmail.com, jay@f42labs.com, clark@f42labs.com,reddy@f42labs.com',
    subject: 'HawkIQ Load Stats : ' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') ,
    html: '<b>GA Load Stats:</b> <br>'  + Thebody ,
};




// send mail with defined transport object
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
});
});
}

module.exports.sendEmailMessage = sendEmailMessage;
