
;(function(global){

var node_https = require('https');


global.node_api = {
    https_request : node_https.get
}
/*node_https.get('https://www.okcoin.com/api/ticker.do?symbol=ltc_cny',function(res){
    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);

    res.on('data',function(d){
        console.log('data'+d)
    })
})*/

})(this);