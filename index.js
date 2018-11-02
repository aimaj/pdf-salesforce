const puppeteer = require('puppeteer');
require('cometd-nodejs-client').adapt();
var lib = require('cometd'); 
var request = require('request');
const fs = require('fs');
var cometd = new lib.CometD();

var username = process.env.username;
var password = process.env.password;
var token = process.env.token;
var clientId = process.env.clientId;
var clientSecret = process.env.clientSecret;

//1. login to salesforce
request.post('https://login.salesforce.com/services/oauth2/token', {
  form: {
  grant_type : 'password',
  client_id : clientId,
  client_secret : clientSecret,
  username : username,
  password : password + token },  
  json: true
}, function (err, res, body) {
  console.log('salesforce login success');
  //setup cometd to listen to the event
  cometd.configure({
    url: body.instance_url + '/cometd/44.0',
    appendMessageTypeToURL: false,
    requestHeaders: {
      'Authorization' : "Bearer " + body.access_token
    }
  });
  
  cometd.handshake(function(h) {
    if (h.successful) {
      console.log('cometd handshake success');
      //2. subscribe to platform event
      cometd.subscribe('/event/Test__e', function(m) {
        console.log('event received');
        //3. create the PDF
        (async () => {
          const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
          const page = await browser.newPage();
          await page.goto('https://login.salesforce.com', {waitUntil: 'networkidle0'});
          await page.click('#username');
          await page.keyboard.type(username);
          await page.click('#password');
          await page.keyboard.type(password);
          await page.click('#Login');
          await page.waitForNavigation({waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 3000000});
          var test = await page.goto(body.instance_url + '/apex/testPage?id=' + m.data.payload.Id__c, {waitUntil: ['domcontentloaded', 'networkidle0']});
          await page.pdf({path: m.data.payload.Id__c + '.pdf', format: 'A4'});
          await browser.close();

          console.log('uploading pdf');
          //4. upload the PDF
          
          //upload to admin user files home
          var endpoint = body.instance_url + '/services/data/v43.0/connect/files/users/0056F00000AkxQCQAZ';
          request({
            uri : endpoint,
            method : 'POST',
            headers : {
              'Authorization' : "Bearer " + body.access_token,
              'Content-Type' : 'multipart/form-data'},   
            formData: 
            {
              fileData : { value : fs.createReadStream(m.data.payload.Id__c + '.pdf'),  
                        options: { "Content-Type" : "application/octet-stream; charset=ISO-8859-1",
                        "filename" : m.data.payload.Id__c + '.pdf'}
              } 
          }
          }, function (err, res, b) {
            obj = JSON.parse(b);
            console.log('upload complete, file id ' + obj.id);

            //5. make a chatter post on the original record, and attach the file
            endpoint = body.instance_url + '/services/data/v43.0/chatter/feed-elements';
            console.log('posting element');
            request({
              uri : endpoint,
              method : 'POST',
              headers : {
                'Authorization' : "Bearer " + body.access_token,
                'Content-Type' : 'application/json; charset=UTF-8'},   
              body: JSON.stringify(
              { "body":   {
                          "messageSegments" : [{
                              "type" : "Text", 
                              "text" : "PDF file generated."
                          }]
                        },
                "capabilities":{
                  "files":{
                    "items": [
                        {"id": obj.id}
                    ]
                  }
              },
              "subjectId" : m.data.payload.Id__c,
              "feedElementType" : "FeedItem"
                })
            }, function (err, res, body) {
              console.log('post complete');
            });
          });
        })();
      });
    } else {
      console.log(JSON.stringify(h));
    }
  });
});

