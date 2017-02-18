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


//Test setup 
var GASTATS = {
    "Brands" : "343",
    "Total Ingested Record Count" : "3536346"
};
var NEWBRANDS = [{
    "name" : "Brand A",
    "id" : "123"
},
{
    "name" : "Brand B",
    "id" : "567"
}];

var Thebody;
request('http://52.37.72.190:9200/', function(error, response, body) {
    if (!error || response.statusCode == '200') {
        //console.log("Calling API for Stats...");
        //console.log("Body is: " + body);
        Thebody = body;
    } 

// setup email data with unicode symbols
let mailOptions = {
    from: '"F42 Admin 👻" <donotreply@f42labs.com>', // sender address
    to: 'mpreddy77@gmail.com, mreddy@localstoreidentity.com', // list of receivers
    subject: 'HawkIQ Load Stats : ' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') ,
    //text: 'Hello world ?', // plain text body
    html: '<b>Brand Stats:</b> <br>'  + Thebody + ' <br><br><b>GA Stats:</b><br>' + Thebody , // html body
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
