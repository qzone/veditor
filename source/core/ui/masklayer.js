(function(ve){
	//遮罩层DOM
	var MASKER_DOM;

	//默认遮罩层样式配置
	var DEF_STYLE_CONFIG = {
		position: 'absolute',
		top: 0,
		left:0,
		width: '100%',
		backgroundColor: 'black',
		zIndex: 8999,
		opacity: 0.5
	};

	/**
	 * 遮罩层
	 * 该对象仅提供单例模式
	 */
	var masklayer = {
		/**
		 * show masklayer
		 * @param {Object} styleConfig 样式配置，支持覆盖所有key
		 */
		show: function(styleConfig){
			if(!MASKER_DOM){
				MASKER_DOM = document.createElement('div');
				document.body.appendChild(MASKER_DOM);
				styleConfig = ve.lang.extend(true, DEF_STYLE_CONFIG, styleConfig || {});
				ve.dom.setStyle(MASKER_DOM, styleConfig);
			}

			var winRegion = ve.dom.getWindowRegion();
			ve.dom.setStyle(MASKER_DOM, 'height',winRegion.documentHeight);
			MASKER_DOM.style.display = '';
		},

		/**
		 * hide masklayer
		 */
		hide: function(){
			if(MASKER_DOM){
				MASKER_DOM.style.display = 'none';
			}
		}
	};
	ve.ui.masklayer = masklayer;
})(VEditor);