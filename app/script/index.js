$.def('core',function(){

    function isType(type) {
        return function(obj) {
            return {}.toString.call(obj) == "[object " + type + "]"
        }
    }

    return {
        isArray    : Array.isArray || isType("Array"),
        isObject   : isType("Object"),
        isFunction : isType("Function"),
        isNumber   :  function(v){
            return typeof v === 'number' && isFinite(v);
        },
        apply      : function(o,p){
            for(var i in p){
                o[i] = p[i];
            }
            return o;
        }
    }
    
});

$.def('observable',function(){


    var Observable = {
        __events__   : {},
        on : function(key,func){
            var keys = key.split(' ');
            var me   = this;
            keys.forEach(function(k){
                if(!me.__events__[k]){
                    me.__events__[k] = [];
                }
                me.__events__[k].push(func);
            })
            return this
        },
        off : function(key){
            if(this.__events__[key]){
                this.__events__[key].length = 0
            }
        },
        trigger : function(key,args){

            if(!this.__events__[key]){return null;}
            this.__events__[key].forEach(function(f){
                f.apply(f,args);
            })
            return this;
        }
    }
    return Observable;

});

$.def('conf',function(){

    var $core = $.use('core');

    function get(name){
        return localStorage.getItem(name);
    }

    var config = {
        partner                 : '', //需要谨慎处理这2个值，目前只做调试用
        secretKey               : '',
        symbol_type             : get('symbol_type') || 'btc',
        btc_buy_price_min_add   : get('btc_buy_price_min_add') || 1,
        btc_buy_price_min_mul   : get('btc_buy_price_min_mul') || -1,
        btc_buy_num_min_add     : get('btc_buy_num_min_add') || 0.01,
        btc_buy_num_max_mul     : get('btc_buy_num_max_mul') || -0.01,
        btc_sell_price_min_add  : get('btc_sell_price_min_add') || 1,
        btc_sell_price_min_mul  : get('btc_sell_price_min_mul') || -1,
        btc_sell_num_min_add    : get('btc_sell_num_min_add') || 0.01,
        btc_sell_num_min_mul    : get('btc_sell_num_min_mul') || -0.01
    }


    return {
        set  : function(name,value){
            config[name] = value;
            localStorage.setItem(name,value)
        },
        get  : function(name){
            return config[name];
        }
    }
});

$.def('https',function(){
    var $node = $.use('node');
    var $conf = $.use('conf');

    var options = {
        hostname : 'www.okcoin.com',
        port     : '443',
        method   : 'POST',
        headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
             'Content-Length': 0
         }
    }
    var paths = {
        userinfo : '/api/userinfo.do'
    }
    function createMD5Sign(obj){
        //obj的参数顺序需要排序
        var args = [], sortObj ={};
        for(var i in obj){
            args.push(i);
        };
        args.sort().forEach(function(n){
            sortObj[n] = obj[n]
        });
        var s = $node.querystring(obj)+$conf.get('secretKey');
        return $node.md5(s);
    }
    return {
        createOption : function(name,post_data_length){
            var ret = options;
            ret.path = paths[name];
            ret.headers['Content-Length'] = post_data_length;
            return ret;
        },
        createQuery  : function(obj){
            obj.partner = $conf.get('partner');
            obj.sign    = createMD5Sign(obj);
            return $node.querystring(obj);
        }
    }
})

;(function(){

var $https = $.use('https');
var $core  = $.use('core');
var $conf  = $.use('conf');
var $node  = $.use('node');
var $observable = $.use('observable');



/**
 * 监听变量改变的机制
 */
var dbus = Object.create($observable);


var meta = {};

/**
 * 选择货币种类
 */

var uHeader = $.BindUI('header');

function createSymbolTypeEvent(type){
    return function(){
        $conf.set('symbol_type',type);
        uHeader.set({
            btc_checked : type=='btc'?true:false,
            ltc_checked : type=='ltc'?true:false
        })
    }
}

uHeader.set({
    btc_checked : $conf.get('symbol_type') == 'btc' ? true : false,
    ltc_checked : $conf.get('symbol_type') == 'ltc' ? true : false,
    btc_click   : createSymbolTypeEvent('btc'),
    ltc_click   : createSymbolTypeEvent('ltc')
});

/**
 * 市场行情
 */
var uBus = $.BindUI('bus-info');
dbus.on('last_btc_price_change',function(){
    if($conf.get('symbol_type')=='btc'){
        uBus.set('last_price',meta['last_btc_price'])
    }
}).on('last_ltc_price_change',function(){
    if($conf.get('symbol_type')==='ltc'){
        uBus.set('last_price',meta['last_ltc_price'])
    }
}).on('depth_btc_change',function(){
    if($conf.get('symbol_type')==='btc'){
        var data = meta['depth_btc'];
        data.asks = data.asks.slice(data.asks.length-5);
        data.bids = data.bids.slice(0,5)
        uBus.set('trick_depth',data)
    }
}).on('depth_ltc_change',function(){
    if($conf.get('symbol_type')==='ltc'){
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
    var symbol_type = $conf.get('symbol_type');
    var url = 'https://www.okcoin.com/api/ticker.do?symbol='+symbol_type+'_cny';
    $node.https.get(url,function(res){
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
    var symbol_type = $conf.get('symbol_type');
    var url = 'https://www.okcoin.com/api/depth.do?symbol='+symbol_type+'_cny';
    $node.https.get(url,function(res){
        //console.log("statusCode: ", res.statusCode);
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


/**
 * 刷新余额
 */
var uBusBuy = $.BindUI('bus-buy');
dbus.on('free_cny_change',function(){
    var cny = meta['free_cny'];
    console.log('cny = '+cny)
    uBusBuy.set('free_cny',cny)
});

function updateUserInfo(){
    var query_data = $https.createQuery({});
    var opt =$https.createOption('userinfo',query_data.length);
    //console.log(query_data)
    var req = $node.https.request(opt,function(res){
        console.log("statusCode: ", res.statusCode);
        res.on('data',function(d){
            console.log(''+d);
            var json = JSON.parse(''+d);
            var free = json.info.funds.free;
            meta['free_cny'] = free.cny;
            meta['free_btc'] = free.btc;
            meta['free_ltc'] = free.ltc;
            dbus.trigger('free_cny_change');
            dbus.trigger('free_btc_change');
            dbus.trigger('free_ltc_change');
        })
    });
    req.write( query_data +'\n');
    req.end();
}
updateUserInfo();


})();
