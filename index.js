
//https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/platform_events_subscribe_cometd.htm

const puppeteer = require('puppeteer');

// Run the adapter code that implements XMLHttpRequest.
require('cometd-nodejs-client').adapt();
// Obtain the CometD APIs.
var lib = require('cometd');
 
// Create the CometD object.
var cometd = new lib.CometD();
 
//https://docs.cometd.org/current/reference/#_javascript_handshake
 





var variables = require('./variables');

var request = require('request');
const fs = require('fs');
request.post('https://login.salesforce.com/services/oauth2/token', {
  form: {
  grant_type : 'password',
  client_id : variables.clientId,
  client_secret : variables.clientSecret,
  username : variables.username,
  password : variables.password + variables.token },  
  json: true
}, function (err, res, body) {
  //console.log(JSON.stringify(body));
  var endpoint = body.instance_url + '/services/data/v43.0/connect/files/users/0056F00000AkxQCQAZ';
  //console.log(endpoint);  
//https://stackoverflow.com/questions/47080869/how-to-manually-create-multipart-form-data
//https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/intro_input.htm
//https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/connect_requests_file_input.htm

  var pageURL = body.instance_url + '/secur/frontdoor.jsp?sid=' + body.access_token;

  //https://www.npmjs.com/package/curl-request


  console.log(pageURL);

    // Configure the CometD object.
    cometd.configure({
      url: body.instance_url + '/cometd/44.0',
      appendMessageTypeToURL: false,
      requestHeaders: {
        'Authorization' : "Bearer " + body.access_token
      }
    });
  
    // Handshake with the server.
    cometd.handshake(function(h) {
      console.log(JSON.stringify(h));
      if (h.successful) {
          // Subscribe to receive messages from the server.
          cometd.subscribe('/event/Test__e', function(m) {
            console.log('server data' + JSON.stringify(m));
              //var dataFromServer = m.data;
              // Use dataFromServer.
  
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
                //await page.waitFor('*');
                
            
                var test = await page.goto('https://c.ap4.visual.force.com/apex/testPage', {waitUntil: ['domcontentloaded', 'networkidle0']});
                await page.pdf({path: 'test.pdf', format: 'A4'});
            
                await browser.close();
                          //PDF UPLOAD
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
                    console.log(err);
                    console.log(res);
                    console.log(body);
                  });
              })();
  
  
        
  
  
  
          });
      }
    });

  //var pageURL = body.instance_url + '/apex/testPage';
    
  //https://salesforce.stackexchange.com/questions/44799/how-to-access-servlet-rtaimage-resources-over-the-api
  //use a cookie to authenticate, not frontdoor jsp

  //http://bobbuzzard.blogspot.com/2017/
  //could do jwt auth on sfdx,
  
  /*
  var child_process=require('child_process');
  console.log('Getting org details');
  var orgDetail=JSON.parse(child_process.execFileSync('sfdx', ['force:org:describe', '--json']));
  var instance=orgDetail.instanceUrl;
  var token=orgDetail.accessToken;
  */


  /*
  or redirects? 
  https://salesforce.stackexchange.com/questions/44799/how-to-access-servlet-rtaimage-resources-over-the-api
  */


  //https://instance.salesforce.com/secur/frontdoor.jsp?sid=session_ID&retURL=optional_relative_url_to_open


//platform event




  

});

