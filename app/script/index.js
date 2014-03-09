
;(function(){

var config = {
    username : '',
    password : '',
    symbol_type : 'btc',
    btc_buy_price_min_add : 1,
    btc_buy_price_min_mul : -1,
    btc_buy_num_min_add : 0.01,
    btc_buy_num_max_mul : -0.01,
    btc_sell_price_min_add : 1,
    btc_sell_price_min_mul : -1,
    btc_sell_num_min_add : 0.01,
    btc_sell_num_min_mul : -0.01
}

var ok_apis = {
    //行情
    ticker : ' https://www.okcoin.com/api/ticker.do',
    depth  : ' https://www.okcoin.com/api/depth.do'
}

function extend(o,p){
    for(var i in p){
        if(p[i]){
            o[i] = p[i]
        }
    }
    return o
}
function setLocal(name,value){
    localStorage.setItem(name,value)
}
function getLocal(name){
    return localStorage.getItem(name);
}
function urlEncode(url,options){
    var args = '';
    for(var i in options){
        args += i + '=' + options[i];
    }
    if(args===''){
        return url;
    }else{
        return url +'?'+args
    }
}

//初始化配置项参数
function initConfig(){
    var get = getLocal;
    var local = {
        username                : get('user_username'),
        password                : get('user_password'),
        symbol_type             : get('symbol_type'),
        btc_buy_price_min_add   : get('btc_buy_price_min_add'),
        btc_buy_price_min_mul   : get('btc_buy_price_min_mul'),
        btc_buy_num_min_add     : get('btc_buy_num_min_add'),
        btc_buy_num_max_mul     : get('btc_buy_num_max_mul'),
        btc_sell_price_min_add  : get('btc_sell_price_min_add'),
        btc_sell_price_min_mul  : get('btc_sell_price_min_mul'),
        btc_sell_num_min_add    : get('btc_sell_num_min_add'),
        btc_sell_num_min_mul    : get('btc_sell_num_min_mul')
    }
    return extend(config,local);
}
initConfig();


/**
 * 监听变量改变的机制
 */
var dbus = {
    ev   : {},
    on : function(key,func){
        if(!this.ev[key]){
            this.ev[key] = []
        }
        this.ev[key].push(func);
        return this
    },
    trigger : function(key){
        if(!this.ev[key]){return ;}
        this.ev[key].forEach(function(f){
            f();
        })
        return this;
    }
}

var meta = {};

/**
 * 选择货币种类
 */

var uHeader = $.BindUI('header');

function createSymbolTypeEvent(type){
    return function(){
        setLocal('symbol_type',type);
        config.symbol_type = type;
        uHeader.set({
            btc_checked : type=='btc'?true:false,
            ltc_checked : type=='ltc'?true:false
        })
    }
}

uHeader.set({
    btc_checked : config.symbol_type == 'btc' ? true : false,
    ltc_checked : config.symbol_type == 'ltc' ? true : false,
    btc_click   : createSymbolTypeEvent('btc'),
    ltc_click   : createSymbolTypeEvent('ltc')
});

/**
 * 市场行情
 */
var uBus = $.BindUI('bus-info');
dbus.on('last_btc_price_change',function(){
    if(config.symbol_type=='btc'){
        uBus.set('last_price',meta['last_btc_price'])
    }
}).on('last_ltc_price_change',function(){
    if(config.symbol_type==='ltc'){
        uBus.set('last_price',meta['last_ltc_price'])
    }
}).on('depth_btc_change',function(){
    if(config.symbol_type==='btc'){
        var data = meta['depth_btc'];
        data.asks = data.asks.slice(data.asks.length-5);
        data.bids = data.bids.slice(0,5)
        uBus.set('trick_depth',data)
    }
}).on('depth_ltc_change',function(){
    if(config.symbol_type==='ltc'){
        var data = meta['depth_ltc'];
        data.asks = data.asks.slice(data.asks.length-5);
        data.bids = data.bids.slice(0,5)
        uBus.set('trick_depth',data);
    }
})

/**
 * 定时刷新最新价格
 */
function updateTickerData(){
    //console.log('run interval');
    var symbol_type = config.symbol_type;
    var url = urlEncode(ok_apis.ticker,{symbol:symbol_type+'_cny'})
    node_api.https_request(url,function(res){
        //console.log("statusCode: ", res.statusCode);
        res.on('data',function(d){
            //console.log(''+d)
            var json = JSON.parse(''+d);
            var k = 'last_'+symbol_type+'_price';
            meta[k] = json.ticker.last;
            dbus.trigger(k+'_change');
        })
    })
};
updateTickerData();
setInterval(updateTickerData,1000);

function updateDepthData(){
    var symbol_type = config.symbol_type;
    var url = urlEncode(ok_apis.depth,{symbol:symbol_type+'_cny'});
    node_api.https_request(url,function(res){
        console.log("statusCode: ", res.statusCode);
         res.on('data',function(d){
             //console.log(''+d)
             var json = JSON.parse(''+d);
             var k = 'depth_'+symbol_type;
             json.symbol_type = symbol_type;
             meta[k] = json;
             dbus.trigger(k+'_change');
        })
    })
}
updateTickerData();
setInterval(updateDepthData,1000)



})();
