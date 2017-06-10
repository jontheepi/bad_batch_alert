//handles actions from the admin website
var WebAdmin = function() {
  var self = this;

  var TWILIO_NUMBER = process.env.TWILIO_NUMBER;
  var MY_NUMBER     = process.env.MY_NUMBER;


  var _usersLoggedIn = [];

  self.init = function(app, webAdminClient, g)
  {

    //Login to admin db
    app.post('/webadmin/login', function (req, res) {
  
     var body = "";
     req.on('data', function (chunk) {
       body += chunk;
     });
     req.on('end', function () {
      console.log(body);
      var jsonBody = JSON.parse(body);
      var username = jsonBody.username;
      var password = jsonBody.password;
      var findQueryString = "SELECT * FROM admin WHERE username = '" + username + "' and password = '" + password + "'" ;
      var findQuery = webAdminClient.query(findQueryString);
      findQuery.on('row', function(row) {
        console.log("found row");
        console.log(JSON.stringify(row));

        //generate an auth token and store it.
        login(row, res);
       
      });

      findQuery.on('end', function(result) {
        console.log('end got called' + result);
        if (result.rowCount > 0) return;
        console.log("did not find user/pass")
        var payload = {
          err:1,
          token:null
        }
        res.status(200)
          .contentType('text/json')
          .send(payload);
        });
      });


    });

    //Get Users In Region
    app.post('/webadmin/getusersinregions', function (req, res) {
      var userCounts = [0,0,0,0,0,0,0,0,0];
     
      var findQueryString = "SELECT * FROM users";  
      var findQuery = webAdminClient.query(findQueryString);
      findQuery.on('row', function(row) {
        var regionString = row.regions;
        if (!row.regions) return;
        var regionArray = regionString.split(", ");
        for (var i = 0; i < regionArray.length; i++){
          var region = parseInt(regionArray[i]);
          userCounts[region] ++;
        }
      });

      findQuery.on('end', function(result) {
        console.log("Completed.")
        var payload = {
          userCounts:userCounts
        }
        res.status(200)
          .contentType('text/json')
          .send(payload);
      });
    });

    //Send test message
    app.post('/webadmin/sendtestmessage', function (req, res) {
      var body = "";
      req.on('data', function (chunk) {
         body += chunk;
      });
      req.on('end', function () {
        console.log(body);
        var jsonBody = JSON.parse(body);
        var regions = jsonBody.regions;
        var message = jsonBody.message;
        var authtoken = jsonBody.authtoken;
        if (!authtoken || !_usersLoggedIn.hasOwnProperty(authtoken)) {
          var payload = {
            err:"notLoggedIn"
          }
          res.status(200)
          .contentType('text/json')
          .send(payload);
          return;
        }
        var row = _usersLoggedIn[authtoken];
        g.twilio.sendMessage({
          to: MY_NUMBER,
          from: TWILIO_NUMBER,
          body: message
        }, function (err) {
          if (err) {
            console.log(err);
          }
        });

        var payload = {
          err:null
        }
        res.status(200)
        .contentType('text/json')
        .send(payload);

      });
    });
  };

  function login(row, res) {
    g.crypto.randomBytes(48, function(err, buffer) {
      var authtoken = buffer.toString('hex');
      _usersLoggedIn[authtoken] = row;
      setTimeout(function(){delete _usersLoggedIn[authtoken];}, 1000*60);//wipe user after 60s

      var payload = {
        err:null,
        token:authtoken,
      }
      res.status(200)
        .contentType('text/json')
        .send(payload);
    });
    
    
  }

};




module.exports = WebAdmin;
