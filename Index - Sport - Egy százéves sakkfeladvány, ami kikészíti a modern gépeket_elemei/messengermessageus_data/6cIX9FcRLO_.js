if (self.CavalryLogger) { CavalryLogger.start_js(["Qg2MK"]); }

__d("MNCommerceLogger",["BanzaiLogger","BanzaiODS"],(function(a,b,c,d,e,f){"use strict";__p&&__p();var g=b("BanzaiLogger").create({signal:!0});function h(a){switch(a){case"devx_upsell_learn_more_clicked":return"devx.upsell.learn_more.clicked";default:return a}}a={logClick:function(a,c,d){b("BanzaiODS").bumpEntityKey(2966,"messenger_commerce",h(a)),g.log("MessengerCommerceLoggerConfig",{brand_app_id:c,user_fbid:d,event:a})},logAuthEvent:function(a,c,d,e){g.log("MessengerCommerceLoggerConfig",{brand_app_id:a,page_id:c,user_fbid:d,event:e}),b("BanzaiODS").bumpEntityKey(2966,"messenger_commerce","auth."+e+".all")}};e.exports=a}),null);
__d("PluginMessengerMessageUs",["Event","MNCommerceLogger"],(function(a,b,c,d,e,f){"use strict";a={setupMessageUsLogging:function(a,c,d,e){b("Event").listen(a,"click",function(){b("MNCommerceLogger").logAuthEvent(c,d,e,"message_us_clicked")})}};e.exports=a}),null);
__d("XMNSendToMessengerContinueAsController",["XController"],(function(a,b,c,d,e,f){e.exports=b("XController").create("/plugins/messenger_platform/send_to_messenger/",{next:{type:"String",required:!0},page_id:{type:"String",required:!0},app_id:{type:"String",required:!0},ref:{type:"String"},switch_user:{type:"String"},is_inapp_browser:{type:"Bool",defaultValue:!1}})}),null);
__d("PluginSendToMessenger",["Arbiter","CSS","DOMEvent","DOMEventListener","FormSubmit","MNCommerceLogger","Plugin","PluginDOMEventListener","PluginMessage","PluginOptin","PluginResize","PopupWindow","UnverifiedXD","URI","XMNSendToMessengerContinueAsController"],(function(a,b,c,d,e,f){"use strict";__p&&__p();var g,h=13;a=function(){__p&&__p();function a(a,c,d,e,f,i,j,k,l,m,n,o,p,q,r,s,t,u,v){__p&&__p();var w=this;this.$1=!1;b("PluginResize").auto(s);(!f||k&&!l)&&b("CSS").hide(e);l=function(a,c){return b("PluginDOMEventListener").add(a,"click",function(a){n==="0"&&u&&location.reload(),c(a)})};e=function(a){return b("DOMEventListener").add(a,"keydown",function(b){b.keyCode===h&&a.click()})};v=u&&v;if(f){var x=new(g||(g=b("URI")))(window.location.search).getQueryData();x.reload==="reload"&&(this.$1=!0,x.id===m&&(b("CSS").show(c),b("CSS").hide(a)));x.act==="send"&&!v&&(b("CSS").show(c),b("CSS").hide(a),i&&this.submit(s));v&&(this.submit(s),b("CSS").show(c),b("CSS").hide(a))}x=function(d){__p&&__p();b("MNCommerceLogger").logAuthEvent(p,o,n,"send_to_messenger_clicked");b("UnverifiedXD").send({type:"sdk_event",event:"send_to_messenger",data:JSON.stringify({event:"clicked",ref:q})});if(k||!r&&!w.$1){new(b("DOMEvent"))(d).kill();if(!j)new(b("PluginOptin"))("send_to_messenger").addLoginParams({logged_in:f,switch_user:k,page_id:o,app_id:p,ref:q,connected:!1,is_inapp_browser:!1,show_subtitle:!0}).addReturnParams({act:"send"}).start();else if(t!=null){d=b("XMNSendToMessengerContinueAsController").getURIBuilder().setString("next",t.toString()).setString("page_id",o).setString("app_id",p).setString("ref",q).setBool("is_inapp_browser",!0).getURI();b("PopupWindow").open(d.toString(),420,450)}}else b("MNCommerceLogger").logAuthEvent(p,o,n,"send_to_messenger_opt_in_client_event"),w.submit(s),b("CSS").show(c),b("CSS").hide(a),b("UnverifiedXD").send({type:"sdk_event",event:"send_to_messenger",data:JSON.stringify({event:"opt_in",ref:q})})};i=function(a){b("UnverifiedXD").send({type:"sdk_event",event:"send_to_messenger",data:JSON.stringify({event:"not_you",ref:q})}),new(b("PluginOptin"))("send_to_messenger").addLoginParams({logged_in:!1,switch_user:!0,page_id:o,app_id:p,ref:q,connected:r,is_inapp_browser:j,show_subtitle:!0}).addReturnParams({act:"send"}).start(),b("PluginMessage").listen()};l(a,x);e(a);d!=null&&(l(d,i),e(d));v=function(d,e){e.identifier===m&&(b("CSS").show(c),b("CSS").hide(a))};b("Arbiter").subscribe(b("Plugin").CONNECT,v)}var c=a.prototype;c.submit=function(a){b("FormSubmit").send(a)};return a}();e.exports=a}),null);