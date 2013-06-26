(function(ve){
	/**
	 * 浏览器ua判断
	 **/
	var uas = navigator.userAgent;

	var ua = {
		opera: window.opera && opera.buildNumber,
		webkit: /WebKit/.test(uas),
		ie: Boolean(window.ActiveXObject),
		ie9Mode: false,					//是否为IE9软件
		docMode: document.documentMode,	//文档模式
		gecko: /WebKit/.test(uas) && /Gecko/.test(uas),
		firefox: (document.getBoxObjectFor || typeof(window.mozInnerScreenX) != 'undefined') ? parseFloat((/(?:Firefox|GranParadiso|Iceweasel|Minefield).(\d+\.\d+)/i.exec(uas) || r.exec('Firefox/3.3'))[1], 10) : null,
		mac: uas.indexOf('Mac') != -1,
		chrome: false,
		air: /adobeair/i.test(uas),
		safari: false,
		isiPod: uas.indexOf('iPod') > -1,
		isiPhone: uas.indexOf('iPhone') > -1,
		isiPad: uas.indexOf('iPad') > -1
	};

	if(typeof(navigator.taintEnabled) == 'undefined') {
	    m = /AppleWebKit.(\d+\.\d+)/i.exec(uas);
	    ua.webkit = m ? parseFloat(m[1], 10) : (document.evaluate ? (document.querySelector ? 525 : 420) : 419);
	    if ((m = /Chrome.(\d+\.\d+)/i.exec(uas)) || window.chrome) {
	        ua.chrome = m ? parseFloat(m[1], 10) : '2.0';
	    } else if ((m = /Version.(\d+\.\d+)/i.exec(uas)) || window.safariHandler) {
	        ua.safari = m ? parseFloat(m[1], 10) : '3.3';
	    }
	}

	if(ua.ie){
		ua.ie = 6;

		(window.XMLHttpRequest || (uas.indexOf('MSIE 7.0') > -1)) && (ua.ie = 7);
		(window.XDomainRequest || (uas.indexOf('Trident/4.0') > -1)) && (ua.ie = 8);
		(uas.indexOf('Trident/5.0') > -1) && (ua.ie = 9);
		(uas.indexOf('Trident/6.0') > -1) && (ua.ie = 10);
		ua.ie9Mode = (9 - ((uas.indexOf('Trident/5.0') > -1) ? 0 : 1) - (window.XDomainRequest ? 0 : 1) - (window.XMLHttpRequest ? 0 : 1)) == 9;
		if(ua.ie == 9){
			ua.ie = document.addEventListener ? 9 : 8;	//防止虚假IE9（指的是文档模型为8）
		}
	}

	ve.ua = ua;
})(VEditor);
