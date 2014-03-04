(function(){
	if(!window.console){
		window.console = {log:QZFL.emptyFn};
	}

	window.VEDITOR_TOOLBAR_PIN = {};
	var FAKE_MASK_ID = 'qzoneblog_veditor_fake_mask';
	var TOP_EDITOR_CSS_LNKID = 'qzoneblog_veditor_css_link';
	var TOP_EDITOR_BASE_TB_LNKID = 'qzoneblog_base_tb_link';
	var TOP_EDITOR_ADV_TB_LNKID = 'qzoneblog_adv_tb_link';

	var removeNode = function(id){
		var n = $(id);
		if(n && n.parentNode){
			n.parentNode.removeChild(n);
		}
		n = null;
	};

	/**
	 * 销毁
	 */
	var destory = function(){
		window.VEDITOR_TOOLBAR_PIN = null;
		removeNode(FAKE_MASK_ID);
		removeNode(TOP_EDITOR_CSS_LNKID);
		removeNode(TOP_EDITOR_BASE_TB_LNKID);
		removeNode(TOP_EDITOR_ADV_TB_LNKID);
		QZFL.event.removeEvent(window, 'scroll', _onScroll);
	};

	/**
	 * 自爆装置
	 */
	var onLeave = function(fn){
		setTimeout(function(){
			try {
				var app = QZONE.FP.getCurrentAppWindow();
				if(app && app.PageScheduler && app.PageScheduler.editorObj && !app.isTemplateBlogEditor){
					onLeave(fn);
				} else {
					fn();
				}
			} catch(ex){
				fn();
			}
		}, 1000);
	};

	var _onScroll = function(){
		try {window.VEDITOR_TOOLBAR_PIN.onScroll();} catch(ex){/** 忽略这里的错误吧。少年 **/};
	};

	var _bindPanelScroll = function(){
		if(window.VEDITOR_TOOLBAR_PIN.onScroll){
			QZFL.event.addEvent(window, 'scroll', _onScroll);
		}
	};

	var start = function(){
		_bindPanelScroll();
	};

	onLeave(function(){
		destory();
	});

	window.VEDITOR_TOOLBAR_PIN = {
		start: start,
		onScroll: null
	};
})();