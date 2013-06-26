var $ = function(id){return document.getElementById(id);};
var create = function(id, tag){
	tag = tag || 'div';
	var d = document.createElement(tag);
	d.id = id;
	document.body.appendChild(d);
	return d;
};

var log = function(msg){
	msg = msg+'' || '';
	var con, log;
	if(!(log = $('log'))){
		log = create('log');
		log.innerHTML = '<p style="font-size:16px; border-bottom:1px solid gray; background-color:#eee; padding:3px;">操作事件</p><div id="op"></div>';
	}
	con = $('op');
	con.innerHTML = '<p>'+ec(msg)+'</p>' + con.innerHTML;
};

var ec = function(str){
	return str.replace(/</g, '&lt;').replace(/>/g,'&gt;');
}

setTimeout(function(){
	var html = document.body.innerHTML;
	con = create('code', 'pre');
	con.innerHTML = '<p style="font-size:16px; border-bottom:1px solid gray; background-color:#eee; padding:3px;">页面代码</p>'+ec(html);
}, 0);
