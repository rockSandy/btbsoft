
/*!
 * ki.js - jQuery-like API super-tiny JavaScript library
 * Copyright (c) 2014 Denis Ciccale (@tdecs)
 * Released under MIT license
 */
! function(b, c, d, e) {

    /*
     * init function (internal use)
     * a = selector, dom element or function
     */

    function i(a) {
        c.push.apply(this, a && a.nodeType ? [a] : '' + a === a ? b.querySelectorAll(a) : e)
    }

    /*
     * $ main function
     * a = css selector, dom object, or function
     * http://www.dustindiaz.com/smallest-domready-ever
     * returns instance or executes function on ready
     */
    $ = function(a) {
        return /^f/.test(typeof a) ? /c/.test(b.readyState) ? a() : $(b).on('DOMContentLoaded', a) : new i(a)
    }

    // set ki prototype
    $[d] = i[d] = {

        // default length
        length: 0,

        /*
         * on method
         * a = string event type i.e 'click'
         * b = function
         * return this
         */
        on: function(a, b) {
            return this.each(function(c) {
                c.addEventListener(a, b)
            })
        },

        /*
         * off method
         * a = string event type i.e 'click'
         * b = function
         * return this
         */
        off: function(a, b) {
            return this.each(function(c) {
                c.removeEventListener(a, b)
            })
        },

        /*
         * each method
         * use native forEach to iterate collection
         * a = the function to call on each iteration
         * b = the this value for that function
         */
        each: function(a, b) {
            c.forEach.call(this, a, b)
            return this
        },

        // for some reason is needed to get an array-like
        // representation instead of an object
        splice: c.splice
    }
}(document, [], 'prototype');

(function($){
    var doc = window.document;

    function Ya(str){
        //核心分析方法
        var  _analyze=function(text){
            return text.replace(/{\$(\s|\S)*?\$}/g,function(s){    
                return s.replace(/("|\\)/g,"\\$1")
                        .replace("{$",'_s.push("')
                        .replace("$}",'");')
                        .replace(/{\%([\s\S]*?)\%}/g, '",$1,"').replace(/\r\n|\n/g,"\\n");
            });
        };
        //中间代码
        var _temp = "var _s=[];"+_analyze(str)+" return _s;";
        //返回生成器render方法
        return {
            render : function(mapping){
                var _a = [],_v = [],i;
                for (i in mapping){
                        _a.push(i);
                        _v.push(mapping[i]);
                }
                return (new Function(_a,_temp)).apply(null,_v).join("");
            }
        }
    };

    /**
     *  list's elements by setting their properties, attributes, CSS styles and/or CSS classes.
     *  example :
     *  $list.set('innerHTML','...')
     *  $list.set('@href','....)
     *  #list.set('$','+show -hide')
     *  $list.set('$width','200px')
     */
    $.prototype.set = function(name,value){
        var me = this ;
        var n  = name.substr(0,1);
        var v  = name.substr(1);
        switch(n){
            case '@':
                return me.each(function(e){
                    e.setAttribute(v,value);
                });
            case '$':
                //addClass,removeClass,toggleClass
                value.split(' ').forEach(function(v){
                    var funcName, className;
                    switch(v.substr(0,1)){
                        case '-': 
                            funcName = 'remove';
                            className = v.substr(1);
                            break;
                        case '+':
                            funcName = 'add';
                            className = v.substr(1);
                            break;
                        default :
                            funcName = 'toggle';
                            className = v;
                            break;
                    }
                    me.each(function(c){
                        c.classList[funcName](className);
                    })
                })
                return this;                 
            case '#':
                return me.each(function(e){
                    e.style[v] = value;
                })
            default :
                me.each(function(e){
                    e[name] = value;
                })
                break;
        }
        return this;
        
    },
    /**
     *  list's elements by setting their properties, attributes, CSS styles and/or CSS classes.
     *  example :
     *  $list.get('innerHTML','...')
     *  $list.get('@href','....)
     *  #list.get('$','+show -hide')
     *  $list.get('$width','200px')
     */
    $.prototype.get = function(name){
        var n = name.substr(0,1);
        var v = name.substr(1);
        var e = this[0]
        switch(n){
            case '@':
                return e.getAttribute(v);
            case '$':
                return e.classList.contains(v)
            case '#':  
                return e.style[v];
            default :
                return e[name]
        }
    }

    

    var APPID = 'ki-app';

    var DIRS = [];

    var DB = function(element){

        this.data  = {};//与UI绑定的数据对象
        this.prox  = {};//代理get值

        this._event= {};

        this.scan(element);
    };
    DB.prototype = {
        bindEvent : {},
        set : function(key,value){
            var keys = [];
            if(typeof key == 'string'){//键-值对赋值
                this.data[key] = value;   
                keys.push(key);
            }else{//对象赋值
                for(var i in key){     
                    this.data[i] = key[i];                           
                    keys.push(i);
                }
            }
            this.triggerHandlerList(keys);
        },
        get : function(key){
            if(this.prox[key]){
                return this.prox[key]();
            }
            return this.map(key);        
        },
        map : function(key){
            return this.data[key];
        },
        /**
         * 绑定监听函数
         * @param {string} type 监听函数键
         * @param {function} func 
         */
        addListener  : function(type,func){
            //console.log(type)
            if(!this._event[type]){ this._event[type] = []; }
            this._event[type].push(func);
            return this;
        },
        /**
         * 移除所有的监听事件
         * 当dom元素被删除或者添加时需要调用该函数
         * @return {this}
         */
        clearEvent : function(){
            this._event = {};
            return this;
        },
        /**
         * 触发单个类型的监听函数，只被trigerHandlerList调用
         * @param  {String} type 类型
         * @param  {Array} args 监听函数的调用参数
         * @return {this}     
         */
        triggerHandler : function(type,args){
            var eventList = this._event[type];
            if(!eventList){ return this; }
            eventList.forEach(function(func){
                func.apply(this,args);
            })
            return this;
        },
        /**
         * 触发多个类型的监听函数，在数据更新之后调用
         * @param  {Array} types 类型数组
         * @param  {Array} args  监听函数的调用参数
         * @return {this}
         */
        triggerHandlerList : function(list,args){
            var self = this;
            list.forEach(function(type){
                self.triggerHandler(type,args);
            })
            return this;
        },
        /**
         * 解析HTML指令,主要检测指令参数的合法性，方便调试
         * @param  {Element} element 指令对应的元素
         * @param  {String} dir      指令名称
         * @param  {String} str      指令参数
         * @return {this}
         */
        parseDir  : function(element,dir,str){
            this.bindEvent[dir].apply(this,[element,str])
        },
        /**
         * 将HTML指令翻译成JS监听函数
         * @return {this}
         */
        scan    : function(element){
            var self = this;

            DIRS.forEach(function(dir){
                var dirstring = element.getAttribute(dir);
                if(dirstring){
                    self.parseDir(element,dir,dirstring);
                }
            });    
            
            if(element.hasChildNodes()){
                var nodes = element.childNodes;
                for(var i=0,len=nodes.length;i<len;i++){
                    var n = nodes[i]
                    if(n.nodeType==1 && !n.getAttribute(APPID)){//子元素已经存在ID属性，不参与扫描
                        self.scan(n);                         
                    }
                }
            }
        }
    }


    function register(dir,func){//注册命令
        DB.prototype.bindEvent[dir] = func;
        DIRS.push(dir);
    }

    register('ki-set',function(element,dir){
        var me = this;
        var $el = $(element);
        dir.split('|').forEach(function(directive){
            var args = directive.split(':');
            me.addListener(args[1],function(){
                //通过get接口将字符串转换成值
                $el.set(args[0],me.map(args[1]))
            })
        })
    });

    register('ki-get',function(element,dir){
        var args = dir.split(':');
        var $el  = $(element);
        this.prox[args[1]] = function(){
            return $el.get(args[0]);
        }
    })

    register('ki-tpl',function(element,dir){

        var args = dir.split(':');
        var me   = this;
        var tmpl = Ya($('#'+args[0]).get('innerHTML'));
        me.addListener(args[1],function(){
            element.innerHTML = tmpl.render(me.map(args[1]))
        })

    })

    $.regDirective = register;
    $.BindUI = function(appid,root){
        root = root || doc;
        var element = root.querySelector('[ki-app="'+appid+'"]');
        return new DB(element);
    }

})($);

(function($){
    //为代码提供组织结构
    
    //$.def(id,func);
    //$.use(id);
    var packages = {} , imports = {};
    $.def = function(id,func){
        packages[id] = func;
    }
    $.use = function(id){
        if(!imports[id]){
            if(packages[id]){
                imports[id] = packages[id].call(this);
            }else{
                throw new Error('==> '+id+' is undefined')
            }
        }
        return imports[id]
    } 

})($)