/**
 * 编辑器核心命令集合
 * 这里包含了各种例如加粗、字体排版等基本命令
 * @deprecate 这个方法应该在后面逐步放出，采用实际的各个插件来实现对应的功能
 **/
(function(ve){
	var IS_BROWSER_COMMANDS = /^(Bold|Italic|Underline|Justifycenter|Justifyleft|Justifyright|Justifyfull|FontSize|removeformat|FontName|InsertOrderedList|InsertUnorderedList|indent|outdent)$/i;

	ve.lang.Class('VEditor.EditorCommands', {
		EditorCommands: function (editor) {
			var _this = this;
			this.editor = editor;
			this.commands = {};

			//扩展editorcommands方法到editor
			ve.lang.each(['addCommand'], function(method){
				editor[method] = function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				};
			});

			//insertHtml命令
			this.addCommand('insertHtml', function(html){
				var rng = editor.getVERange();
				rng.insertHtml(html);
				rng.collapse();
			});
		},

		/**
		 * 执行命令
		 * @param {Mix} cmd
		 * @param {...}
		 * @deprecate 此方法执行过程会将原型链置回this.editor， 原有的方法还提供了 editor,btn两个默认参数，
		 * 现在不干这档子事，因为一些command根本没有btn
		 * 如果调用browserCommand的话，参数2、参数3将为ui和value
		 **/
		execCommand: function(cmd, arg1, arg2){
			var _this = this,
				doc = this.editor.getDoc(),
				args = ve.lang.arg2Arr(arguments, 1),
				fireParams = [this.editor, cmd].concat(args);

			//fire before execute
			this.editor.onBeforeExecCommand.fire.apply(this.editor.onBeforeExecCommand, fireParams);

			//直接执行函数
			if(typeof(cmd) == 'function'){
				cmd.apply(this.editor, args);
			}

			//用户添加命令
			else if(this.commands[cmd]){
				this.commands[cmd].apply(this.editor, args);
			}

			//浏览器原生方法
			else if(typeof(cmd) == 'string' && IS_BROWSER_COMMANDS.test(cmd)){
				doc.execCommand(cmd, arg1 || false, arg2);
			}

			//没有找到方法
			else {
				throw('NO COMMAND FOUND');
			}

			//额外使用.fire.apply来触发事件
			this.editor.onAfterExecCommand.fire.apply(this.editor.onAfterExecCommand, fireParams);
		},

		/**
		 * 添加一个命令
		 * @param {String} name 命令名称
		 * @param {Function} fn 处理函数（如果是浏览器命令，此处可以为空）
		 **/
		addCommand: function(name, fn){
			if(this.commands[name] || !fn){
				throw('ADD COMMAND PARAM ERROR');
			}
			this.commands[name] = fn;
		},

		/**
		 * 移除一个命令
		 * 这里只能移除用户添加的command，移除不了浏览器原生的command
		 * @param {String} name
		 **/
		removeCommand: function(name){
			if(this.commands[name]){
				this.commands[name] = null;
			}
		},

		/**
		 * 判定是否拥有一个命令
		 * @param {String} name
		 * @return {Boolean}
		 **/
		hasCommand: function(name){
			return !!this.commands[name] || IS_BROWSER_COMMANDS.test(name);;
		}
	});
})(VEditor);