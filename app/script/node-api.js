
$.def('node',function(){

    var https = require('https');
    var crypt = require('crypto');
    var querystring= require('querystring');

    return {
        https : https,
        md5   : function(text){
            return crypt.createHash('md5').update(text).digest('hex').toUpperCase();
        },
        querystring : querystring.stringify
    }

})
