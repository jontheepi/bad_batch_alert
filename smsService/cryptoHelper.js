var crypto = require('crypto');
var CRYPTO_KEY    = process.env.CRYPTO_KEY;
var CRYPTO_ALGO   = 'aes-256-ctr';


var cryptoHelper = function() {

  var self = this;

  self.encrypt = function(text) {
    var cipher = crypto.createCipher(CRYPTO_ALGO, CRYPTO_KEY);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  };
   
  self.decrypt = function(text) {
    var decipher = crypto.createDecipher(CRYPTO_ALGO, CRYPTO_KEY);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  };

};

module.exports = cryptoHelper;