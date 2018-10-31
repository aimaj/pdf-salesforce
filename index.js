const puppeteer = require('puppeteer');
require('cometd-nodejs-client').adapt();
var lib = require('cometd'); 
var variables = require('./variables');
var request = require('request');
const fs = require('fs');
var cometd = new lib.CometD();

/**
 * TODO:
 * fire platform event from button on record
 * create parameters on vfp that grab data from server
 * make vfp hardcoded link come from the instance url
 * implement uploading file onto the record passed in the platform event
 * load onto heroku
 * add more things to the constants file, eg: api version, plat event name
 */


//1. login to salesforce
request.post('https://login.salesforce.com/services/oauth2/token', {
  form: {
  grant_type : 'password',
  client_id : variables.clientId,
  client_secret : variables.clientSecret,
  username : variables.username,
  password : variables.password + variables.token },  
  json: true
}, function (err, res, body) {
  console.log('salesforce login success');
  //file upload endpoint for later, just uploads to user home
  var endpoint = body.instance_url + '/services/data/v43.0/connect/files/users/0056F00000AkxQCQAZ';
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
          const browser = await puppeteer.launch();
          const page = await browser.newPage();
          await page.goto('https://login.salesforce.com', {waitUntil: 'networkidle0'});
          await page.click('#username');
          await page.keyboard.type(variables.username);
          await page.click('#password');
          await page.keyboard.type(variables.password);
          await page.click('#Login');
          await page.waitForNavigation({waitUntil: ['domcontentloaded', 'networkidle0']});
          var test = await page.goto('https://c.ap4.visual.force.com/apex/testPage', {waitUntil: ['domcontentloaded', 'networkidle0']});
          await page.pdf({path: 'test.pdf', format: 'A4'});
          await browser.close();

          //4. upload the PDF
          request({
            uri : endpoint,
            method : 'POST',
            headers : {
              'Authorization' : "Bearer " + body.access_token,
              'Content-Type' : 'multipart/form-data'},   
            formData: {
            fileData : { value : fs.createReadStream('test.pdf'),
                      options: { "Content-Type" : "application/octet-stream; charset=ISO-8859-1",
                      "filename" : "test.pdf"}
              } 
            }
          }, function (err, res, body) {
            console.log('upload complete');
          });
        })();
      });
    }
  });
});

