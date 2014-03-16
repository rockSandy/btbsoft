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
        partner             : get('partner'), //需要谨慎处理这2个值，目前只做调试用
        secretKey           : get('secretKey'),
        symbol_type         : get('symbol_type') || 'btc',
        btc_buy_price_min   : get('btc_buy_price_min') || 1,
        btc_buy_num_min     : get('btc_buy_num_min') || 0.01,
        btc_sell_price_min  : get('btc_sell_price_min') || 1,
        btc_sell_num_min    : get('btc_sell_num_min') || 0.01,
        ltc_buy_price_min   : get('ltc_buy_price_min') || 1,
        ltc_buy_num_min     : get('ltc_buy_num_min') || 0.01,
        ltc_sell_price_min  : get('ltc_sell_price_min') || 1,
        ltc_sell_num_min    : get('ltc_sell_num_min') || 0.01
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
        userinfo : '/api/userinfo.do',
        getorders: '/api/getorder.do',
        cancelorder : '/api/cancelorder.do',
        trade    : '/api/trade.do'
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
        var s = $node.querystring(sortObj)+$conf.get('secretKey');
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

$.def('errorCode',function(){
    var map = {
        10000 : '必选参数不能为空',
        10001 : '用户请求过于频繁',
        10002 : '系统错误',
        10003 : '未在请求限制列表中,稍后请重试',
        10004 : 'IP限制不能请求该资源',
        10005 : '密钥不存在',
        10006 : '用户不存在',
        10007 : '签名不匹配',
        10008 : '非法参数',
        10009 : '订单不存在',
        10010 : '余额不足',
        10011 : '买卖的数量小于BTC/LTC最小买卖额度',
        10012 : '当前网站暂时只支持btc_cny ltc_cny',
        10013 : '此接口只支持https请求',
        10014 : '下单价格不得≤0或≥1000000',
        10015 : '下单价格与最新成交价偏差过大'  
    }
    return function(err){
        return map[err];
    }
})

$.def('settings',function(){
    var $conf = $.use('conf');

    var uSetting = $.BindUI('settings');
    uSetting.set({
        settings_ok : function(){
            set();
            hide();
        },
        settings_chance : function(){
            init();
            hide();
        }
    })
    var names = [
        'btc_buy_price_min',
        'btc_buy_num_min',
        'btc_sell_price_min',
        'btc_sell_num_min',
        'ltc_buy_price_min',
        'ltc_buy_num_min',
        'ltc_sell_price_min',
        'ltc_sell_num_min'
    ]

    function init(){
        var obj = {};
        names.forEach(function(v){
            obj[v] = $conf.get(v);
        })
        uSetting.set(obj)
    }
    function set(){
        names.forEach(function(v){
            var value = uSetting.get(v);
            $conf.set(v,value);
        })
    }
    function show(){
        uSetting.set('state','-dp-n');
    }
    function hide(){
        uSetting.set('state','+dp-n');
    }
    return {
        init : init,
        show : show,
        hide : hide
    }
})


$.def('login',function(){
    var $conf = $.use('conf');

    var uLogin = $.BindUI('login_in');

    function init(){
        uLogin.set({
            partner : $conf.get('partner'),
            secret_key : $conf.get('secretKey'),
            login_in : function(){
                var p = uLogin.get('partner');
                var s = uLogin.get('secret_key');
                $conf.set('partner',p.trim());
                $conf.set('secretKey',s.trim());
                hide()
            },
            login_chance : function(){
                uLogin.set({
                    partner : $conf.get('partner'),
                    secret_key : $conf.get('secretKey')
                });
                hide();
            }
        })
    }
    function show(){
        uLogin.set('state','-dp-n')
    }
    function hide(){
        uLogin.set('state','+dp-n')
    }

    return {
        init : init,
        show : show,
        hide : hide 
    }
})


;(function(){

var $https = $.use('https');
var $core  = $.use('core');
var $conf  = $.use('conf');
var $node  = $.use('node');
var $observable = $.use('observable');
var $error = $.use('errorCode');

var $settings = $.use('settings');
var $login    = $.use('login');


if(!$conf.get('partner')){
    $login.init();
    $login.show();
}
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
        });
        uBusBuy.set('symbol',type.toUpperCase());
        uBusSell.set('symbol',type.toUpperCase());
    }
}

uHeader.set({
    btc_checked : $conf.get('symbol_type') == 'btc' ? true : false,
    ltc_checked : $conf.get('symbol_type') == 'ltc' ? true : false,
    btc_click   : createSymbolTypeEvent('btc'),
    ltc_click   : createSymbolTypeEvent('ltc'),
    show_login_in: function(){
        $login.init();
        $login.show();
    },
    show_settings: function(){
        $settings.init();
        $settings.show();
    }
});

/**
 * 市场行情
 */
var uBus = $.BindUI('bus-info');
dbus.on('last_price_change',function(){
    var symbol_type = $conf.get('symbol_type');
    var price = meta['last_'+symbol_type+'_price'];
    var cny   = meta['free_cny'];
    uBus.set('last_price',price);
    if(cny){
        uBusBuy.set('able_buy',Math.round(cny/price*1000)/1000);
    }
    updateTotalWorth();
}).on('depth_btc_change',function(){
    if($conf.get('symbol_type')==='btc'){
        var data = meta['depth_btc'];
        //data.asks = data.asks.slice(data.asks.length-5);
        //data.bids = data.bids.slice(0,5)
        uBus.set('trick_depth',data)
    }
}).on('depth_ltc_change',function(){
    if($conf.get('symbol_type')==='ltc'){
        var data = meta['depth_ltc'];
        //data.asks = data.asks.slice(data.asks.length-5);
        //data.bids = data.bids.slice(0,5)
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
            dbus.trigger('last_price_change');
        })
    })
};


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
            if($core.isArray(json.asks)&& $core.isArray(json.bids)){
                json.asks = json.asks.slice(json.asks.length-5);
                json.bids = json.bids.slice(0,5)
                meta[k] = json;
                dbus.trigger(k+'_change');
            }   
        })
    })
}


/**
 * 刷新余额
 */
var uBusBuy = $.BindUI('bus-buy');

function updateTotalPrice(){
    var price = uBusBuy.get('buy_price');
    var num   = uBusBuy.get('buy_num');
    var total = parseFloat(price)*parseFloat(num);
    uBusBuy.set('total_price',isNaN(total)?0:total);
}
function createBuyTotalPro(n){
    var block = n;
    return function(){
        var cny = meta['free_cny'];
        var symbol_type = $conf.get('symbol_type');
        var last_price = meta['last_'+symbol_type+'_price'];

        var ret = Math.round(cny/last_price/block*1000)/1000;

        uBusBuy.set('buy_num',isNaN(ret)?0:ret);
        dbus.trigger('buy_num_change');
    }
}
function updateTotalWorth(){
    var cny      = meta['free_cny'];
    var free_btc = meta['free_btc']; 
    var free_ltc = meta['free_ltc'];
    var btc_price= meta['last_btc_price'];
    var ltc_price= meta['last_ltc_price'];

    var cny = parseFloat(cny);
    var btc_worth = parseFloat(free_btc)*parseFloat(btc_price);
    var ltc_worth = parseFloat(free_ltc)*parseFloat(ltc_price);
    cny       = isNaN(cny)?0:cny;
    btc_worth = isNaN(btc_worth)?0:btc_worth;
    ltc_worth = isNaN(ltc_worth)?0:ltc_worth;
    uBusBuy.set('total_worth',cny+btc_worth+ltc_worth);
}
dbus.on('free_cny_change',function(){
    var cny = meta['free_cny'];
    var k = 'last_'+$conf.get('symbol_type')+'_price';
    var last_price = meta[k];
    uBusBuy.set('free_cny',cny);
    if(last_price){
        uBusBuy.set('able_buy_btc',cny/last_price);
    }
    updateTotalWorth();
});
dbus.on('buy_price_change buy_num_change',updateTotalPrice)

uBusBuy.set({
    symbol : $conf.get('symbol_type').toUpperCase(),
    toggle_asset: function(){
        var f = uBusBuy.get('class_asset');
        if(f=='+vb-h'){
            uBusBuy.set({
                class_asset : '-vb-h',
                button_show_name : '隐藏总资产'
            })
        }else{
            uBusBuy.set({
                class_asset : '+vb-h',
                button_show_name : '显示总资产'
            })
        }
    },
    update_free : function(){
        updateUserInfo();
    },
    update_total  : updateTotalPrice,
    buy_price_add : function(){
        var price = uBusBuy.get('buy_price');
        var symbol_type = $conf.get('symbol_type');
        var add   = $conf.get(symbol_type+'_buy_price_min');
        var ret   = parseFloat(price)+parseFloat(add);
        uBusBuy.set('buy_price',isNaN(ret)?0:ret);
        dbus.trigger('buy_price_change');
    },
    buy_price_mul : function(){
        var price = uBusBuy.get('buy_price');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_buy_price_min');
        var ret = parseFloat(price)-parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusBuy.set('buy_price',ret>0?ret:0);
        dbus.trigger('buy_price_change');
    },
    buy_num_add : function(){
        var num = uBusBuy.get('buy_num');
        var symbol_type = $conf.get('symbol_type');
        var add   = $conf.get(symbol_type+'_buy_num_min');
        var ret   = parseFloat(num)+parseFloat(add);
        uBusBuy.set('buy_num',isNaN(ret)?0:ret);
        dbus.trigger('buy_num_change');
    },
    buy_num_mul : function(){
        var num = uBusBuy.get('buy_num');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_buy_num_min');
        var ret = parseFloat(num)-parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusBuy.set('buy_num',ret>0?ret:0);
        dbus.trigger('buy_num_change');
    },
    set_price_1 : function(){
        var symbol_type = $conf.get('symbol_type');
        var data = meta['depth_'+symbol_type];
        var obj = data.asks[4];
        var price = parseFloat(obj[0])
        uBusBuy.set('buy_price',isNaN(price)?0:price);
        dbus.trigger('buy_price_change')
    },
    set_price_5 : function(){
        var symbol_type = $conf.get('symbol_type');
        var data = meta['depth_'+symbol_type];
        var obj = data.asks[0];
        var price = parseFloat(obj[0]);
        uBusBuy.set('buy_price',isNaN(price)?0:price);
        dbus.trigger('buy_price_change')
    },
    set_price_1_min : function(){
        var symbol_type = $conf.get('symbol_type');
        var data = meta['depth_'+symbol_type];
        var obj = data.asks[4];
        var price = parseFloat(obj[0])+0.01;
        price = Math.round(price*100)/100;
        uBusBuy.set('buy_price',isNaN(price)?0:price);
        dbus.trigger('buy_price_change')
    },
    buy_total_pro_1 : createBuyTotalPro(1),
    buy_total_pro_2 : createBuyTotalPro(2),
    buy_total_pro_3 : createBuyTotalPro(3),
    buy_total_pro_4 : createBuyTotalPro(4),
    buy_total_pro_5 : createBuyTotalPro(5),
    buy_total_pro_6 : createBuyTotalPro(6),
    buy_total_pro_7 : createBuyTotalPro(7),
    buy_total_pro_8 : createBuyTotalPro(8),
    buy_total_pro_9 : createBuyTotalPro(9),
    buy_total_pro_10 : createBuyTotalPro(10),
    buy_now : function(){
        var obj = {
            symbol : $conf.get('symbol_type')+'_cny',
            type : 'buy',
            rate : uBusBuy.get('buy_price'),
            amount : uBusBuy.get('buy_num')
        };
        console.log(JSON.stringify(obj));
        if(confirm('确定买入吗?')){
            trade_now(obj);
        }
    }
});

/**
 * 销售单
 */
var uBusSell = $.BindUI('bus-sell');

function updateSellTotal(){
    var symbol_type = $conf.get('symbol_type');
    var price = uBusSell.get('sell_price');
    var num   = uBusSell.get('sell_num');
    var ret   = parseFloat(price)*parseFloat(num);
    uBusSell.set('about_total_price',isNaN(ret)?0:ret);
}
function createSellTotalPro(n){
    return function(){
        var symbol_type = $conf.get('symbol_type');
        var total_num   = meta['free_'+symbol_type];
        var ret = parseFloat(total_num)/n;
        ret = Math.round(ret*1000)/1000;
        uBusSell.set('sell_num',isNaN(ret)?0:ret);
        dbus.trigger('sell_num_change');
    }
    

}

dbus.on('free_btc_change',function(){
    var symbol_type = $conf.get('symbol_type');
    if(symbol_type=='btc'){
        var amount = meta['free_btc'];
        var last_price = meta['last_btc_price'];
        var able_to_cny = parseFloat(amount) * parseFloat(last_price)
        uBusSell.set({
            amount : amount,
            able_to_cny : isNaN(able_to_cny)?0:able_to_cny
        });
    } 
}).on('free_ltc_change',function(){
    var symbol_type = $conf.get('symbol_type');
    if(symbol_type=='ltc'){
        var amount = meta['free_ltc'];
        var last_price = meta['last_ltc_price'];
        var able_to_cny = parseFloat(amount) * parseFloat(last_price)
        uBusSell.set({
            amount : amount,
            able_to_cny : isNaN(able_to_cny)?0:able_to_cny
        });
    } 
}).on('sell_price_change sell_num_change',updateSellTotal)

uBusSell.set({
    symbol : $conf.get('symbol_type').toUpperCase(),
    update_sell_info : updateUserInfo,
    update_total : updateSellTotal,
    sell_price_mul : function(){
        var price = uBusSell.get('sell_price');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_sell_price_min');
        var ret = parseFloat(price)-parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusSell.set('sell_price',ret>0?ret:0);
        dbus.trigger('sell_price_change');
    },
    sell_price_add : function(){
        var price = uBusSell.get('sell_price');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_sell_price_min');
        var ret = parseFloat(price)+parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusSell.set('sell_price',ret>0?ret:0);
        dbus.trigger('sell_price_change');
    },
    sell_num_mul   : function(){
        var num = uBusSell.get('sell_num');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_sell_num_min');
        var ret = parseFloat(num)-parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusSell.set('sell_num',ret>0?ret:0);
        dbus.trigger('sell_num_change');
    },
    sell_num_add   : function(){
        var num = uBusSell.get('sell_num');
        var symbol_type = $conf.get('symbol_type');
        var mul = $conf.get(symbol_type+'_sell_num_min');
        var ret = parseFloat(num)+parseFloat(mul);
        ret = isNaN(ret)?0:ret;
        uBusSell.set('sell_num',ret>0?ret:0);
        dbus.trigger('sell_num_change');
    },
    set_price_5: function(){
        var symbol_type = $conf.get('symbol_type');
        var data = meta['depth_'+symbol_type];
        var obj = data.bids[4];
        var price = parseFloat(obj[0]);
        uBusSell.set('sell_price',isNaN(price)?0:price);
        dbus.trigger('sell_price_change')
    },
    set_price_1_min : function(){
        var symbol_type = $conf.get('symbol_type');
        var data = meta['depth_'+symbol_type];
        var obj = data.asks[4];
        var price = parseFloat(obj[0])-0.01;
        price = Math.round(price*100)/100;
        uBusSell.set('sell_price',isNaN(price)?0:price);
        dbus.trigger('sell_price_change')
    },
    sell_total_pro_1 : createSellTotalPro(1),
    sell_total_pro_2 : createSellTotalPro(2),
    sell_total_pro_3 : createSellTotalPro(3),
    sell_total_pro_4 : createSellTotalPro(4),
    sell_total_pro_5 : createSellTotalPro(5),
    sell_total_pro_6 : createSellTotalPro(6),
    sell_total_pro_7 : createSellTotalPro(7),
    sell_total_pro_8 : createSellTotalPro(8),
    sell_total_pro_9 : createSellTotalPro(9),
    sell_total_pro_10 : createSellTotalPro(10),
    sell_now : function(){
        var obj = {
            symbol : $conf.get('symbol_type')+'_cny',
            type : 'sell',
            rate : uBusSell.get('sell_price'),
            amount : uBusSell.get('sell_num')
        };
        console.log(JSON.stringify(obj));
        if(confirm('确定卖出吗?')){
            trade_now(obj);
        }
    }
})

var uOrders = $.BindUI('user-order');
dbus.on('orders_update',function(){
    var symbol_type = $conf.get('symbol_type');
    var data = meta[symbol_type+'_orders'];
    //console.log(JSON.stringify(data))
    uOrders.set('orders_list',data);
});

window.delete_order = function(order_id){
    var symbol_type = $conf.get('symbol_type');
    var query_data = $https.createQuery({
        symbol : symbol_type+'_cny',
        order_id : order_id
    });
    var opt = $https.createOption('cancelorder',query_data.length);
    var req = $node.https.request(opt,function(res){
        console.log("statusCode: "+res.statusCode);
        res.on('data',function(d){
            console.log(''+d);
            var json = JSON.parse(''+d);
            if(json.result){
                updateOrders();
            }
        })
    });
    req.write(query_data+'\n');
    req.end();
}

uOrders.set({
    update_order : updateOrders
});

function updateUserInfo(){
    var query_data = $https.createQuery({});
    var opt =$https.createOption('userinfo',query_data.length);
    //console.log(query_data)
    var req = $node.https.request(opt,function(res){
        //console.log("statusCode: ", res.statusCode);
        res.on('data',function(d){
            //console.log(''+d);
            var json = JSON.parse(''+d);
            if(json.result){
                var free = json.info.funds.free;
                meta['free_cny'] = free.cny;
                meta['free_btc'] = free.btc;
                meta['free_ltc'] = free.ltc;
                dbus.trigger('free_cny_change');
                dbus.trigger('free_btc_change');
                dbus.trigger('free_ltc_change');
            }
            
        })
    });
    req.write( query_data +'\n');
    req.end();
}

function updateOrders(){
    var symbol_type = $conf.get('symbol_type');
    var query_data = $https.createQuery({
        order_id : '-1',
        symbol: symbol_type+'_cny'
    });
    var opt = $https.createOption('getorders',query_data.length);

    //console.log(JSON.stringify(query_data))
    //console.log(JSON.stringify(opt))
    var req = $node.https.request(opt,function(res){
        //console.log("statusCode: "+res.statusCode);
        res.on('data',function(d){
            //console.log(''+d);
            var json = JSON.parse(''+d);
            if(json.result){
                json.symbol_type = symbol_type;
                meta[symbol_type+'_orders'] = json;
                dbus.trigger('orders_update');
            }
        })
    });
    req.write(query_data+'\n');
    req.end();
}

function trade_now(obj){
    var query_data = $https.createQuery(obj);
    var opt = $https.createOption('trade',query_data.length);

    var req = $node.https.request(opt,function(res){
        console.log("statusCode: "+res.statusCode);
        res.on('data',function(d){
            console.log(''+d);
            var json = JSON.parse(''+d);
            if(json.result){
                alert('下单成功');
                updateOrders();
            }else{
                alert('下单失败,错误:'+json.errorCode)
            }
        })
    });
    req.write(query_data+'\n');
    req.end();
}

updateUserInfo();
updateTickerData();
updateDepthData();
setInterval(updateUserInfo,1700);
setTimeout(updateOrders,500);
setInterval(updateDepthData,1500);
setInterval(updateTickerData,1600); 
setInterval(updateOrders,3500);


})(); 
