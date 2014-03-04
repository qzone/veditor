(function(){
	var ve = parent.VEditor;
	var editorId = getParameter('id', location.href);
	var editor = ve.get(editorId);
	if(!editor){
		alert("非法调用");
		return;
	}

	var uploadUrl = editor.getConfig('uploadUrl', 'image');
	var tabs = editor.getConfig('tabs', 'image') || 'remote,local';
	if(tabs.indexOf('remote') < 0 || !uploadUrl){
		throw("文件上传参数错误");
	}
	tabs = tabs.split(',');
	var UPLOADING = false;
	var g = function(id){return document.getElementById(id);};
	var setUploadState = function(uploading){
		UPLOADING = uploading;
		g('local-file').disabled = uploading ? true : false;
	};
	var scaleAvaImg = function(obj, bW, bH, cb){
		var img = new Image();
		img.onload = function(){
			var newW, newH, ml, mt,
				w = this.width,
				h = this.height;

			g('txt-w').value = w;
			g('txt-h').value = h;
			g('txt-b').value = 0;
			g('txt-m').value = 0;

			var rate = w/h;
			var bRate = bW/bH;
			if(rate > bRate){
				newW = bW;
				newH = h/w * bW;
				mt = (bH - newH)/2;
			} else {
				newH = bH;
				newW = w/h * bH;
				ml = (bW - newW)/2;
			}
			var s = 'width:'+newW+'px;height:'+newH+'px;'+(ml ? 'margin-left:'+ml+'px;' : '')+(mt ? 'margin-top:'+mt+'px;':'');
			obj.style.cssText = s;
			cb && cb();
		};
		img.src = obj.src;
	};
	var _setCurrent;

	g('insert-btn').disabled = true;
	g('remote-form').action = uploadUrl;
	ve.lang.each(tabs, function(t){
		ve.dom.removeClass(g(t+'-tab'), 'none');
		ve.dom.removeClass(g(t+'-tab'), 'none');
		if(!_setCurrent){
			ve.dom.removeClass(g(t+'-panel'), 'none');
			ve.dom.addClass(g(t+'-tab'), 'current');
			_setCurrent = true;
		}
	});

	//自动表单
	var form = g('remote-form');
	var iframeID = 'formsubmitiframe';
	var iframe = document.createElement('iframe');
	iframe.id = iframeID;
	iframe.name = iframeID;
	iframe.style.display = 'none';
	iframe.callback = function(msg, code, src){
		if(src){
			g('img').src = src;
			g('remote-addr').value = src;
			g('insert-btn').disabled = false;
		} else if(msg){
			alert(msg);
			g('insert-btn').disabled = true;
			ve.dom.removeClass(g('img-con'), 'img-loading');
		}
		setUploadState(false);
	};
	document.body.appendChild(iframe);
	form.target = iframeID;

	g('local-file').onchange = function(){
		if(this.value){
			g('img').src = '';
			ve.dom.addClass(g('img-con'), 'img-loading');
			setUploadState(true);
			g('insert-btn').disabled = true;
			form.submit();
		}
	};

	g('img').onload = function(){
		scaleAvaImg(this, 120, 120, function(){
			ve.dom.removeClass(g('img-con'), 'img-loading');
		});
	};

	g('remote-addr').onblur = function(){
		if(this.value){
			g('img').src = this.value;
		}
	};

	g('insert-btn').onclick = function(){
		top.popupCallback(g('img').src, g('txt-w').value, g('txt-h').value);
	};

	var checkR = function(){
		setTimeout(function(){
			g('insert-btn').disabled = !g('remote-addr').value;
		}, 0);
	}
	g('remote-addr').onchange = checkR;
	g('remote-addr').onkeyup = checkR;
	g('remote-addr').onmouseup = checkR;
	g('remote-addr').onpaste = checkR;

	var ls = g('nav').getElementsByTagName('li');
	for(var i=0; i<ls.length; i++){
		ls[i].onclick = function(){
			var showRemote = this.id == 'remote-tab';
			if(showRemote && UPLOADING){
				if(confirm('图片正在上传，是否要取消上传？')){
					setUploadState(false);
					ve.dom.removeClass(g('img-con'), 'img-loading');
				} else {
					return;
				}
			}
			g('remote-tab').className = showRemote ? 'current' : '';
			g('local-tab').className = showRemote ? '' : 'current';
			g('remote-panel').className = showRemote ? 'row' : 'none';
			g('local-panel').className = showRemote ? 'none' : 'row';
		}
	}
})();