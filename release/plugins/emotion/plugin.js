/**
 * 空间默认表情
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	/**
	 * 表情库选择器
		*
	 * @namespace
	 * @type
	 */
	var QzoneEmotion = {
		/**
		 * 表情风格存放路径 <br/> 通常显示表情后,都回加载以下路径的表情风格 <br/> themePath + theme + ".js"
			*
		 * @type String
		 */
		_themePath : "http://imgcache.qq.com/qzone/em/theme",
		
		_emotionList : {},
		
		/**
		 * 绑定表情按钮
			*
		 * @param {string|element} element 对象或则对象的id
		 * @return QzoneEmotionObject
		 * @see QzoneEmotionObject
		 *      @example
		 *      <br/>
			*
		 * QzoneEmotion.bind("div");<br/>
		 * @return QzoneEmotionPanel
		 */
		bind : function(element, theme, editor) {
			/**
			 * @default "defalut"
			 */
			theme = theme || "default";
			return new QzoneEmotionPanel(element, theme, this._themePath, editor);
		},
		
		/**
		 * 设置表情风格的主要路径 皮肤的主路径只要设置一次即可,默认是空值 通常QZFL的皮肤都是放在
		 * http://imgcache.qq.com/qzone/em/theme 目录下.
			*
		 * @param {string} path 表情风格主要路径
		 */
		setThemeMainPath : function(path) {
			this._themePath = path;
		},
		
		/**
		 * 添加表情
			*
		 * @param {string} emotionName 表情名称
		 * @param {object} emotionPackage 表情包
		 */
		addEmotionList : function(emotionName, emotionPackage) {
			this._emotionList[emotionName] = emotionPackage;
		},
		
		/**
		 * 获取表情包
			*
		 * @param {string} emotionName 表情名称
		 */
		getEmotionPackage : function(emotionName) {
			return this._emotionList[emotionName];
		}
	};
	
	/**
	 * 表情面板对象
		*
	 * @deprecated 不要直接使用这个构造函数创建对象
	 * @constructor
	 */
	var QzoneEmotionPanel = function(element, theme, themePath, editor) {
		/**
		 * 编辑器对象
		 */
		this.editor = editor;
		
		/**
		 * 触发表情选择器的按钮对象
		 */
		this.element = element;
		
		/**
		 * 表情包名称
		 */
		this.theme = theme;
		
		/**
		 * 表情面板
		 */
		this.panel = null;
		
		/**
		 * 表情包
		 */
		this.package = null;
		
		/**
		 * 表情库路径
			*
		 * @ignore
		 * @private
		 */
		this._jsPath = themePath + "/" + this.theme + ".js";
		
		/**
		 * 表情样式路径
			*
		 * @private
		 */
		this._cssPath = themePath + "/" + this.theme + ".css";
		
		/**
		 * @private
		 */
		this._emPreview = null;
		
		/**
		 * @private
		 */
		this._init();
		
		/**
		 * 选择表情
			*
		 * @event
		 */
		this.onSelect = function(){};
		
		/**
		 * 当表情框显示后
			*
		 * @param {element} panel 表情面板
		 * @param {element} target 激活表情框的对象
		 * @event
		 */
		this.onShow = function(){};
		
		/**
		 * 是否隐藏
			*
		 * @type boolean
		 */
		this._isHide = true;
	};
	
	/**
	 * 初始化表情面板
	 */
	QzoneEmotionPanel.prototype._init = function() {
		this.panel = document.createElement('div');
		this.panel.style.cssText = 'display:none;position:absolute;border:1px solid #999;padding:3px;background:#fff;font-size:12px;;z-index:10001';
		this.panel.className = "qzfl_emotion_panel";
		document.body.appendChild(this.panel);
		ve.dom.event.add(this.element, "click", ve.lang.bind(this, this.show));
		ve.dom.event.add(this.panel, "click", ve.lang.bind(this, this.select));
	};
	
	/**
	 * 加载表情
	 */
	QzoneEmotionPanel.prototype._loadTheme = function() {
		if (this.package) { // 如果表情包已经添加则直接显示
			this._show();
		} else { // 如果表情包没有加载则自动加载
			this.panel.innerHTML = "正在加载表情...";
			this.panel.style.display = "";
			this.panel.style.position = "absolute";
			
			var targetPos = ve.dom.getPosition(this.element);
			this.panel.style.top = (targetPos.top + targetPos.height) + 'px';
			this.panel.style.left = targetPos.left + 'px';
			
			var _this = this;
			
			ve.net.loadScript(this._jsPath, function(){
				_this.package = QzoneEmotion.getEmotionPackage(_this.theme);
				_this._show();
			});
			ve.net.loadCss(this._cssPath);
		}
	};
	
	/**
	 * 显示表情
		*
	 */
	QzoneEmotionPanel.prototype.show = function(e) {
		this._loadTheme();
		ve.dom.event.preventDefault(e);
	};
	
	QzoneEmotionPanel.prototype._show = function() {
		// 坐标修正
		this._build();
		
		// 坐标修正
		var targetPos = ve.dom.getPosition(this.element);
		var _dialogWidth = ve.dom.getPosition(this.panel).width;
		
		var editorWidth = ve.dom.getSize(this.editor.iframeElement)[0];
		var editorLeft = ve.dom.getXY(this.editor.iframeElement)[0];
		
		//放不下
		if((editorWidth - (targetPos.left - editorLeft)) < _dialogWidth) {
			ve.dom.setStyles(this.panel, {
				left: editorLeft + editorWidth - _dialogWidth,
				top:  targetPos.top + targetPos.height
			});
			}else{
			ve.dom.setStyles(this.panel, {
				left: targetPos.left,
				top: targetPos.height
			});
		}
		
		if (!this._bindD) {
			this._bindD = ve.lang.bind(this, this.hide);
			this._bindM = ve.lang.bind(this, this._mousemove);
			
			ve.dom.event.add(document, "mousedown", this._bindD);
			ve.dom.event.add(document, "mousemove", this._bindM);
		}
		
		this._isHide = false
		this.onShow(this.panel, this.element);
	};
	
	/**
	 * 建立表情面板
	 */
	QzoneEmotionPanel.prototype._build = function() {
		var html = ['<div id="emPreview_' + this.theme + '" class="qzfl_emotion_preview_' + this.theme + '" style="display:none"><img src=""/><span></span></div>', '<ul style="width:440px;" class="qzfl_emotion_' + this.theme + '">'];
		for (var i = 0; i < this.package.length; i++) {
			html.push('<li><a href="javascript:;" emotionid="' + i + '" onclick="return false;"><div emotionid="' + i + '" class="icon emotion_' + this.theme + '_' + i + '"></div></a></li>')
		}
		html.push('</ul>');
		
		this.panel.innerHTML = html.join("");
		this.panel.style.display = "";
		this._lastEmotion = null;
		this._emPreview = ve.dom.get("emPreview_" + this.theme);
		this._emPreImg = this._emPreview.getElementsByTagName("img")[0];
		this._emPreText = this._emPreview.getElementsByTagName("span")[0];
		this._panelPosition = ve.dom.getPosition(this.panel);
	};
	
	/**
	 * 隐藏表情框
	 */
	QzoneEmotionPanel.prototype.select = function(e) {
		var target = ve.dom.event.getTarget(e);
		var _eID = target.getAttribute("emotionid");
		if (_eID) {
			
			this.onSelect({
				id : _eID,
				fileName : this.package.filename[_eID],
				package : this.package
			});
			
			this._hide();
		}
		
		//取消浏览器的默认事件
		ve.dom.event.preventDefault(e);
	};
	
	/**
	 * 鼠标移动
	 */
	QzoneEmotionPanel.prototype._mousemove = function(e) {
		var target = ve.dom.event.getTarget(e);
		var _eID = target.getAttribute("emotionid");
		
		if (ve.dom.isAncestor(this.panel, target)) {
			if (_eID && this._lastEmotion != _eID) {
				this._emPreview.style.display = "";
				this._lastEmotion = _eID;
				
				// 修正预览框位置
				if (ve.dom.event.mouseX(e) < this._panelPosition.left + this._panelPosition.width / 2) {
					this._emPreview.style.left = "";
					this._emPreview.style.right = "3px";
				} else {
					this._emPreview.style.left = "3px";
					this._emPreview.style.right = "";
				}
				
				this._emPreImg.src = this.package.filename[_eID];
				this._emPreText.innerHTML = this.package.titles[_eID] || "";
			}
		} else {
			this._lastEmotion = null;
			this._emPreview.style.display = "none";
		}
	};
	
	/**
	 * 隐藏表情框
	 */
	QzoneEmotionPanel.prototype.hide = function(e) {
		if (this._isHide) {
			return;
		}
		
		var target = ve.dom.event.getTarget(e);
		if (target == this.panel || ve.dom.isAncestor(this.panel, target)) {
			
		} else {
			this._hide();
		}
	};
	
	/**
	 * 隐藏表情框
		*
	 * @ignore
	 * @see QzoneEmotionPanel.prototype.hide
	 */
	QzoneEmotionPanel.prototype._hide = function() {
		this.panel.style.display = "none";
		this._emPreview = null;
		ve.dom.event.remove(document, "mousedown", this._bindD);
		ve.dom.event.remove(document, "mousemove", this._bindM);
		delete this._bindD;
		delete this._bindM;
		this._isHide = true;
	};
	
	//非QZONE环境适配
	window.QZONE = window.QZONE || {widget:{}};
	if(!QZONE.widget){
		QZONE.widget = {emotion:QzoneEmotion};
	} else {
		QZONE.widget.emotion = QzoneEmotion;
	}

	var HOST = 'http://i.gtimg.cn';
	if(!window.imgcacheDomain){
		window.imgcacheDomain = 'i.gtimg.cn';
	}

	if(window.imgcacheDomain){
		if(imgcacheDomain.indexOf('http://') == 0){
			HOST = imgcacheDomain;
		} else {
			HOST = 'http://'+imgcacheDomain;
		}
	}

	ve.lang.Class('VEditor.plugin.Emotion', {
		bEmotionLoaded: false,
		editor: null,
		emotionPanel: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('emotion', {
				'class': 'veEmotion',
				title: '表情',
				cmd: function(){
					if(!_this.emotionPanel){
						_this.emotionPanel = QzoneEmotion.bind(_this.btn.getDom(), null, _this.editor);
						_this.emotionPanel.onSelect = function(imgObj){
							_this.execute(imgObj);
						};
						_this.emotionPanel.show();
					}
				}
			});
			this.editor.onClick.add(function(){_this.hide()});
		},

		execute: function(emoObj){
			if(emoObj){
				var src = emoObj.fileName;
				if(src.indexOf('/') == 0){
					src = HOST + src;
				}
				var title = emoObj.package.titles[emoObj.id];
				var html = '<img src="'+src+'" alt="'+title+'" />&nbsp;';
				this.editor.insertHtml({content:html});
			}
		},

		show: function(){
			_this._waitingPanel.style.display = "none";

		},

		hide: function(){
			if(this.emotionPanel){
				this.emotionPanel.hide();
			}
		}
	});
	ve.plugin.register('emotion', VEditor.plugin.Emotion);
})(VEditor);