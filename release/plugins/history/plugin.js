(function(ve) {
	var MAX_HISTORY_COUNT = 20;
	var MAX_KEYDOWN_COUNT = 5;
	var CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;

	/**
	 * 历史
	 */
	ve.lang.Class('VEditor.plugin.History', {
		editor:null,
		index: 0,
		data: [],
		maxHistoryCount: 20,	//最大历史记录次数
		onBeforeAdd: null,
		onChange: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.onBeforeAdd = new ve.EventManager(this.editor);
			this.onChange = new ve.EventManager(this.editor);

			//初始化
			this.reset();
			this.addCommands();
			this.addUIControls();
			this.bindShortCuts();

			//防止跟 onInitComplete -> setContent冲突，这里提前
			this.editor.onInitComplete.addFirst(function(){
				_this.bindHandlerEvent();
			});
		},

		bindHandlerEvent: function(){
			var _this = this;

			var _COM_SET_FLAG;
			this.editor.onBeforeSetContent.add(function(params){
				_COM_SET_FLAG = params.addHistory;
				if(params.addHistory){
					_this.add();
				}
			});

			//setContent之后
			_this.editor.onAfterSetContent.add(function(params){
				_COM_SET_FLAG = false;
				if(!params.addHistory){
					_this.reset(_this.editor.getBody().innerHTML);
				}
			});

			//由于当前add的是在 keycount足够的时候执行，所以这里要补一下
			this.editor.onBeforeExecCommand.add(function(cmd){
				if(cmd == 'insertHtml' && _COM_SET_FLAG){
					//忽略setContent(addHistory:true)情况
					//那边的已经设置了
				} else {
					_this.add();
				}
			});

			//commands绑定
			//保证在 updateLastVERange之后
			_this.editor.onAfterExecCommand.addLast(function(cmd){
				if(cmd != 'undo' && cmd != 'redo'){
					_this.add();
				}
			});

			//clearContent之后
			_this.editor.onAfterClearContent.add(function(){
				_this.add();
			});

			//paste
			//所有粘贴事件插件处理完毕再介入history
			_this.editor.onAfterPaste.addLast(function(){
				_this.add();
			});

			_this.onBeforeAdd.add(function(){
				CURRENT_KEY_COUNT = 0;
			});

			var ignoreKeys = {
				16:1, 17:1, 18:1,	//shift, ctrl, alt
				37:1, 38:1, 39:1, 40:1	//方向键
			};

			//输入法keydown keycode
			var InputMethodDetectedHash = {
				229: 1, //mac safari, ie9 chrome
				231: 1,
				197: 1	//opera
			};
			var bInputMethodOpened;

			//keydown事件用于监测中文输入法
			_this.editor.onKeyDown.addLast(function(e){
				var rng = _this.editor.getVERange();	//选中删除情况
				if(!rng.collapsed && !e.ctrlKey){		//去除ctrl+z, ctrl+y冲突
					_this.add();
				}
				bInputMethodOpened = !!InputMethodDetectedHash[e.keyCode];
			});

			//处理添加逻辑
			_this.editor.onKeyUp.addLast(function(e){
				var keyCode = e.keyCode;
				var rng = _this.editor.getVERange();

				//完成切换需要添加历史
				//修正输入法下面的切换（这里的空白键不那么准确，需要依赖输入法的按键设置
				//对于数字选词，这里可能存在用户【多次选词】的情况，所以该项判断被移除：/^[0-9]$/.test(String.fromCharCode(keyCode))
				if(keyCode == 32){
					bInputMethodOpened = false;
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
				}

				//执行删除操作需要立即记录历史
				if(keyCode == 8){
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
				}

				if(bInputMethodOpened){
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;	//中文输入法结束时，才添加一个history
				} else if(!ignoreKeys[keyCode] && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey ) {
					if(++CURRENT_KEY_COUNT >= MAX_KEYDOWN_COUNT) {
						_this.add();
					}
				}
			});
		},

		/**
		 * 添加编辑器命令
		 **/
		addCommands: function(){
			var _this = this;
			_this.editor.addCommand('undo', function(){_this.undo();});
			_this.editor.addCommand('redo', function(){_this.redo();});

			this.editor.addIO('addHistory', function(){
				return _this.add();
			})
		},

		/**
		 * 绑定撤销重做快捷键
		 **/
		bindShortCuts: function(){
			var _this = this;
			this.editor.addShortcut('ctrl+z', function(){_this.undo();});
			this.editor.addShortcut('ctrl+y', function(){_this.redo();});
			//mac 额外支持
			if(ve.ua.mac){
				this.editor.addShortcut('meta+z', function(){_this.undo();});
				this.editor.addShortcut('meta+shift+z', function(){_this.redo();});
			}
		},

		/**
		 * 添加撤销重做UI
		 **/
		addUIControls: function(){
			var _this = this;
			var tm = _this.editor.toolbarManager;
			tm.createButton('undo', {title:'撤销(ctrl+z)', 'class':'veUndo', cmd:'undo', onInit: function(){
				var curBtn = this;
				_this.onChange.add(function(hasUndo, hasRedo){
					curBtn[hasUndo ? 'setEnabled' : 'setDisable']();
				});
			}});
			tm.createButton('redo', {title:'恢复(ctrl+y)', 'class':'veRedo', cmd:'redo', onInit: function(){
				var curBtn = this;
				_this.onChange.add(function(hasUndo, hasRedo){
					curBtn[hasRedo ? 'setEnabled' : 'setDisable']();
				});
			}});
		},

		/**
		 * 更新状态接口
		**/
		updateState: function(){
			this.onChange.fire(this, this.hasUndo(), this.hasRedo());
		},

		/**
		 * 直接获取HTML 提高速度
		 * @return {String}
		**/
		getHtmlContent: function(){
			return ve.string.trim(this.editor.getBody().innerHTML);
		},

		/**
		 * 添加历史
		 * 这里做单线程延迟处理，防止例如keydown连续触发效率问题、
		 * onAfterExecCommand与updateLastVERange逻辑冲突问题
		**/
		add: function() {
			this.onBeforeAdd.fire();

			var currentClip = this.getClip();

			//内容一致，不添加历史步骤
			if(this.data[this.index].content == currentClip.content){
				//console.log('history.add 内容一致，不添加历史步骤');
				return;
			}

			//历史长度超出情况
			if((this.index+1) >= MAX_HISTORY_COUNT){
				this.data = this.data.slice(MAX_HISTORY_COUNT-this.index, MAX_HISTORY_COUNT);
				this.data.push(currentClip);
				//console.log('history.add 历史长度超出情况', this.data);
			}

			//常规情况
			else {
				this.data[++this.index] = currentClip;
				//console.log('history.add 常规情况', this.data, this.getHtmlContent());
			}

			this.updateState();
		},

		/**
		 * 获取当前内容状态
		 * @return {Object}
		**/
		getClip: function(){
			if(ve.ua.safari){
				var content = this.getHtmlContent();
				return {
					content: content,
					fullContent: content
				}
			}

			var content = this.getHtmlContent();

			if(!this.editor.isFocused()){
				this.editor.focus();
			}

			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark(true, true);
			var fullContent = this.getHtmlContent();
			rng.moveToBookmark(bookmark);
			rng.select(true);

			return {
				fullContent: fullContent,
				content: content
			}
		},

		/**
		 * 恢复指定的历史场景
		 * @param {Object} clip
		**/
		restore: function(clip){
			this.editor.getBody().innerHTML = clip.fullContent;

			if(clip.initState){
				this.editor.getBody().innerHTML = clip.fullContent;
			} else {
				var rng = this.editor.getVERange();
				rng.moveToBookmark();
				rng.select(true);
			}
		},

		/**
		 * 重做
		**/
		redo: function() {
			if(this.hasRedo()){
				var clip = this.data[++this.index];
				this.restore(clip);
				this.updateState();
			}
		},

		/**
		 * 撤销
		**/
		undo: function() {
			if(this.hasUndo()){
				var clip =  this.data[--this.index];
				this.restore(clip);
				this.updateState();
			}
		},

		/**
		 * 是否有undo
		 * @return {Boolean}
		**/
		hasUndo: function() {
			return this.index > 0;
		},

		/**
		 * 是否有redo
		 * @return {Boolean}
		**/
		hasRedo: function() {
			return this.index < (this.data.length - 1);
		},

		/**
		 * reset editor undo system
		 * @param {String} html
		 */
		reset: function(html){
			//console.log('调用reset', html);
			html = html || '';
			html = ve.string.trim(html);
			CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
			this.index = 0;
			this.data = [{content:html, fullContent:html, initState:true}];
			this.updateState();
		}
	});
	ve.plugin.register('history', VEditor.plugin.History);
})(VEditor);