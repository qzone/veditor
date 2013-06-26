(function(ve){
	var KEYS = ve.dom.event.KEYS;
	var UTF8_SPACE = decodeURI('%C2%A0');
	var LINE_HEIGHT = 20;
	var TIP_CLASS = 'veditor_mention_tips';
	var LINK_CLASS = 'q_namecard c_tx';

	ve.dom.insertStyleSheet(null, [
			'.veditor_mention_tips .current {background-color:#CCE5FA} ',
			'.veditor_mention_tips img {vertical-align:middle; height:30px; width:30px; margin-right:5px}',
			'.veditor_mention_tips li {cursor:pointer;padding:2px 5px; margin:0; white-space:nowrap}'
		].join(''));

	/**
	 * Qzone @功能，该插件仅在qzone环境下有效，其他独立环境（包括朋友网）未部署相应的后台cgi
	 * @deprecated @功能采用按键输入上下文检测，因此不能输入空格作为检测的一部分，@标记为链接，识别字段为uin
	 */
	ve.lang.Class('VEditor.plugin.QzoneMention', {
		editor: null,
		maxFilterCount: 5,
		tip: null,
		inputing: false,
		className: 'qzone_mention_user',

		friendList: [],
		lastRegion: null,

		/**
		 * 插件初始化
		 * @param {object} editor
		 * @param {string} url
		 */
		init: function (editor, url) {
			if(!QZONE.FP.getFriendList){
				throw("qzonemention require QZONE.FP.getFriendList");
			}
			var _this = this;
			this.editor = editor;

			//[fix] ie下会将 abc@a这种转换成为邮箱地址,关闭IE地址自动转换功能
			if(ve.ua.ie && ve.ua.ie >= 9){
				this.editor.onInitComplete.add(function(){
					_this.editor.getDoc().execCommand("AutoUrlDetect", false, false);
				});
			}

			//对外方法
			this.editor.addIO('onAddMentionUsers', new ve.EventManager(this.editor));
			this.editor.addIO('onRemoveMentionUsers', new ve.EventManager(this.editor));
			this.editor.addIO('onInsertMentionUser', new ve.EventManager(this.editor));
			this.editor.addIO('getMentionUinList', function(){return _this.getMentionUinList();});
			this.editor.addIO('getMentionUserList', function(callback){return _this.getMentionUserList(callback);});
			this.editor.addIO('getUsersInfoFromUins', function(uins, callback){
				if(!uins.length){
					callback([]);
					return;
				}
				_this.getFriendList(function(){
					var result = [];
					ve.lang.each(uins, function(uin){
						var info = _this.getUserInfoFromCache(uin);
						if(info){
							result.push(info);
						}
					});
					callback(result);
				})
			});

			var _lastUserList = [];
			var _settingContent = false;

			this.editor.onAfterSetContent.addLast(function(str){
				_lastUserList = _this.getMentionUinList();
				_settingContent = true;
			});

			this.editor.onAfterUpdateVERangeLazy.add(function(){
				if(_settingContent){
					_settingContent = false;
					return;
				}
				var userList = _this.getMentionUinList();
				var removedUserList = getRemovedUserList(userList,_lastUserList);
				var addedUserList = getAddedUserList(userList,_lastUserList);
				_this.editor.tryIO('onAddMentionUsers', function(ev){ev.fire(_this, addedUserList);});
				_this.editor.tryIO('onRemoveMentionUsers', function(ev){ev.fire(_this, removedUserList);});
				_lastUserList = userList;
			});

			//在好友列表里面进行键盘快捷操作，如方向键和回车键
			//这里把控制事件放入keyDown, 提前到其他类似updaterange, history前面
			var _insertMentionChar;
			this.editor.onKeyDown.addFirst(function(e){
				//输入@的时候
				if(e.keyCode == 50 && e.shiftKey){
					_insertMentionChar = true;
				} else {
					_insertMentionChar = false;
				}

				//up, down, tab
				if(_this.inputing){
					if(e.keyCode == KEYS.UP || e.keyCode == KEYS.DOWN || e.keyCode == KEYS.TAB){
						_this.movePanelIndex(e.keyCode == KEYS.DOWN || e.keyCode == KEYS.TAB);
						ve.dom.event.preventDefault(e);
						return false;
					} else if(e.keyCode == KEYS.RETURN){
						var lis = _this.tip.getElementsByTagName('li');
						var uin;
						ve.lang.each(lis, function(li){
							if(ve.dom.hasClass(li, 'current')){
								uin = li.getAttribute('uin');
								return false;
							}
						})
						if(uin){
							var userInfo = _this.getUserInfoFromCache(uin);
							if(userInfo){
								_this.insertMetionUser(userInfo);
								_this.hideTip();
								ve.dom.event.preventDefault(e);
								return false;
							}
						}
					}
				}
			});

			//KEY KEYS.UP
			this.editor.onKeyUp.addLast(function(e){
				if(_insertMentionChar || (e.keyCode == 50 && e.shiftKey)){
					var rng = _this.editor.getVERange();
					var bookmark = rng.createBookmark();
					var st = bookmark['start'];
					st.style.cssText = 'inline-block;width:1px; height:1px; padding:1px;';
					var r = ve.dom.getRegion(st);
					_this.lastRegion = {left:r.left, top:r.top};
					rng.moveToBookmark(bookmark);
					return;
				}
				_insertMentionChar = false;

				if(!e.ctrlKey && !e.shiftKey &&
					e.keyCode != KEYS.UP && e.keyCode != KEYS.DOWN &&
					e.keyCode != KEYS.RETURN && e.keyCode != KEYS.TAB && e.keyCode != KEYS.ESC){
					_this.detectStr();
				} else if(e.keyCode == KEYS.ESC){
					_this.hideTip();
				}
			});

			//PASTE
			this.editor.onAfterPaste.addLast(function(){
				_this.detectStr();
			});

			//鼠标点击，关闭tip
			this.editor.onMouseDown.add(function(){
				_insertMentionChar = false;
				_this.lastRegion = null;
				_this.hideTip();
			});

			//MOUSE UP
			this.editor.onMouseUp.addLast(function(ev){
				//[fix 右键使得ie range混乱]
				if(ve.dom.event.getButton(ev) == 0){
					setTimeout(function(){
						_this.detectStr();
					}, 50);
				}
			});

			//打开菜单
			this.editor.onBeforeOpenListBox.add(function(){
				_this.hideTip();
			});

			//before toggle html state
			this.editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ev.add(function(){
					_this.hideTip();
				});
			});
		},

		/**
		 * 获取当前@用户号码列表
		 * @return {Array}
		 */
		getMentionUinList: function(){
			var _this = this, result = [], uinList = [],
				as = this.editor.getDoc().getElementsByTagName('A');
			ve.lang.each(as, function(a){
				var linkAttr = a.getAttribute('link');
				var uin = a.getAttribute('uin');
				if(!uin && linkAttr){
					var linkTxt = a.innerHTML.replace(ve.fillCharReg, '');
					if(linkTxt.substring(0,1) == '@'){
						uin = linkAttr.replace(/namecard_/ig, '');
					}
				}
				if(uin){
					uinList.push(uin);
				}
			});
			return uinList;
		},

		/**
		 * 获取当前编辑器插入@用户列表
		 * @param {Function} callback
		 */
		getMentionUserList: function(callback){
			var _this = this,
				uinList = this.getMentionUinList();
			if(uinList.length){
				this.getFriendList(function(){
					ve.lang.each(uinList, function(uin){
						var info = _this.getUserInfoFromCache(uin);
						if(info){
							result.push(info);
						}
					});
					callback(result);
				})
			} else {
				callback([]);
			}
		},

		/**
		 * 检测@字串
		 */
		detectStr: function(){
			var _this = this;
			var aStr = this.getMentionStr();
			if(aStr == '@'){
				this.inputing = true;
				this.getFriendList(function(){
					_this.showTip('请输入好友号码、昵称或备注');
				});
			} else if(aStr){
				this.inputing = true;
				this.getFriendList(function(friendList){
					var html = _this.srchFriendList(aStr.substring(1), friendList);
					if(html){
						_this.showTip(html, true);
					}
				});
			} else {
				this.hideTip();
			}
		},

		/**
		 * 获取当前焦点所在文本的@字串
		 * @return {String}
		 */
		getMentionStr: function(){
			var rng = this.editor.getVERange();
			if(!rng.collapsed || ignoreLinkNode(rng)){
				return '';
			}
			var pStr = _getStrLeft(rng);
			var nStr = ''; //暂不支持
			return _parseMentionStr(pStr, nStr);
		},

		/**
		 * 插入@用户
		 * @param  {Object} userInfo
		 */
		insertMetionUser: function(userInfo){
			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark();
			this.editor.tryIO('addHistory', function(fn){return fn()});

			var sc = rng.startContainer,
				so = rng.startOffset,
				link;

			if(sc.nodeType == 1){
				if(!so){
					link = sc.tagName == 'A' ? sc : null;
				} else {
					var n = sc.childNodes[so-1];
					if(n.nodeType == 3){
						link = sc.tagName == 'A' ? sc : null;
					}
				}
			} else if(sc.nodeType == 3){
				link = sc.parentNode.tagName == 'A' ? sc.parentNode : null;
			}

			var foundLink = link;
			if(!link){
				cutStr(bookmark.start, 'previousSibling');
				link = rng.doc.createElement('A');
			}

			link.href = 'http://user.qzone.qq.com/'+userInfo.uin+'/';
			link.className = LINK_CLASS;
			link.target = '_blank';
			link.setAttribute('uin', userInfo.uin);
			link.setAttribute('link', 'nameCard_'+userInfo.uin);
			link.innerHTML = '@'+(userInfo.name || userInfo.memo);

			//当前节点非link，则插入一个
			if(!foundLink){
				ve.dom.insertBefore(link, bookmark.start);
				var sep = rng.doc.createElement('span');
				sep.innerHTML = '&nbsp;';
				ve.dom.insertBefore(sep, bookmark.start);
				ve.dom.remove(sep, true);
				rng.moveToBookmark(bookmark);
				rng.select();
			} else {
				rng.setStartAfter(link);
				rng.collapse(true);
				rng.select();
			}
			this.editor.updateLastVERange();
			this.editor.tryIO('onInsertMentionUser', function(ev){
				return ev.fire(this.editor, userInfo);
			});
		},

		/**
		 * 获取当前光标位置
		 * @return {[type]} [description]
		 */
		getCurrentCaretRegion: function(){
			var region = this.lastRegion;
			var left = 0, top = 0;

			if(!region){
				var rng = this.editor.getVERange();
				if(rng.collapsed){
					var bookmark = rng.createBookmark();
					bookmark.start.style.display = 'inline-block';
					region = ve.dom.getRegion(bookmark.start);
					top = region.top;
					left = region.left;
					rng.moveToBookmark(bookmark);
					rng.select(true);
					this.lastRegion = region;
				}
			} else {
				left = region.left;
				top = region.top;
			}

			if(this.editor.iframeElement){
				var frameRegion = ve.dom.getRegion(this.editor.iframeElement);
				if(frameRegion){
					top += frameRegion.top
					left += frameRegion.left;
				}
			}
			return {left:left, top:top};
		},

		/**
		 * 显示@的tip
		 * @param  {String} str
		 * @param  {Boolean} bList 是否显示为列表
		 */
		showTip: function(str, bList){
			this.inputing = bList;
			var _this = this;
			if(!this.tip) {
				this.tip = document.createElement("div");
				this.tip.className = TIP_CLASS;
				this.tip.style.cssText = "position:absolute;display:none;border:1px solid #71c3f2;background-color:#d7ecff;background-color:rgba(215,236,255,0.9);-moz-border-radius: 3px;	-webkit-border-radius: 3px; color:#000A11;font-size:12px;z-index:9999;";
				document.body.appendChild(this.tip);

				ve.dom.event.add(this.tip, 'click', function(e){
					var tag = ve.dom.event.getTarget(e);
					var li = ve.dom.getParent(tag, function(n){
						return n.tagName == 'LI';
					});
					if(li){
						var uin = li.getAttribute('uin');
						if(uin){
							var userInfo = _this.getUserInfoFromCache(uin);
							if(userInfo){
								_this.insertMetionUser(userInfo);
								_this.hideTip();
							}
						}
					}
					ve.dom.event.preventDefault();
				})
			}

			this.tip.style.display = "";
			this.tip.innerHTML = str;

			var posInfo = this.getCurrentCaretRegion();
			var tipSize = ve.dom.getSize(this.tip);

			if(window.frameElement){
				var frameSize = ve.dom.getSize(window.frameElement);
				if(posInfo){
					var left = (posInfo.left + tipSize[0] > frameSize[0]) ? (frameSize[0] - tipSize[0]) : posInfo.left;
					var top = (posInfo.top + tipSize[1] > frameSize[1]) ? (posInfo.top - tipSize[1] - 5) : posInfo.top+LINE_HEIGHT;

					this.tip.style.left = left+ "px";
					this.tip.style.top = top+ "px";
				}
			} else {
				if(posInfo){
					this.tip.style.left = posInfo.left + "px";
					this.tip.style.top = (posInfo.top + LINE_HEIGHT) + "px";
				}
			}
		},

		/**
		 * 隐藏tip
		 */
		hideTip: function(){
			if(this.tip){
				this.tip.style.display = 'none';
				this.inputing = false;
			}
		},

		/**
		 * 移动面板聚焦index
		 * @param  {Boolean} bDown 是否为向下
		 */
		movePanelIndex: function(bDown){
			if(this.tip){
				var lis = this.tip.getElementsByTagName('LI');
				var idx;
				ve.lang.each(lis, function(li, i){
					if(ve.dom.hasClass(li, 'current')){
						idx = i;
						return false;
					}
				});

				ve.dom.removeClass(lis[idx], 'current');

				var nextIdx = 0;
				if(bDown){
					nextIdx = idx == (lis.length-1) ? 0 : (idx+1);
				} else {
					nextIdx = idx == 0 ? (lis.length-1) : idx - 1;
				}
				ve.dom.addClass(lis[nextIdx], 'current');
			}
		},

		/**
		 * 从cache里面获取用户信息
		 * @param {Number} uin
		 * @param {String} userName 用户昵称
		 * @return {Object}
		 */
		getUserInfoFromCache: function(uin, userName){
			if(!uin && !userName){
				return null;
			}
			userName = ve.string.trim(userName) || '';
			var userInfo = null;
			ve.lang.each(this.friendList, function(user){
				//UIN 判定 || 用户名（需要去除头尾空格，因为QQ昵称是可以插入空格的，所以这里就不再做更严格的校验了
				if(user.uin == uin || (userName && ve.string.trim(user.name) == userName)){
					userInfo = user;
					return false;
				}
			});
			return userInfo;
		},

		/**
		 * 查询好友关键字命中
		 * @param  {String} srchKey
		 * @param  {Object} friendList
		 * @return {String}
		 */
		srchFriendList: function(srchKey, allFriendList){
			var _this = this;
			var friendList = [];
			var _tmp = {};
			ve.lang.each(allFriendList, function(friend){
				if(friendList.length == _this.maxFilterCount) {
					return false;
				}
				if([friend["uin"],friend["name"].toRealStr(),(friend["memo"] || "")].join("").toLowerCase().indexOf(srchKey.toLowerCase()) != -1){
					_tmp[friend.uin] = true;
					friendList.push(friend);
				}
			});
			ve.lang.each(allFriendList, function(friend){
				if(friendList.length == _this.maxFilterCount) {
					return false;
				}
				if(!_tmp[friend.uin] && [(friend["namePY"] || '').toRealStr(),(friend["memoPY"] || '').toRealStr()].join("").toLowerCase().indexOf(srchKey.toLowerCase()) != -1) {
					_tmp[friend.uin] = true;
					friendList.push(friend);
				}
			});

			if(!friendList.length){
				this.hideTip();
				return;
			}

			var strHTML = '<ul>';
			for(var i=0; i<friendList.length; ++i) {
				strHTML += '<li uin="'+friendList[i].uin+'"'+(i==0?'class="current"' :'')+'>';
				strHTML += '<img alt="用户头像" src="'+QZBlog.Util.PortraitManager.getPortraitUrl(friendList[i]["uin"],30)+'" />';

				if(friendList[i]["memo"]) {
					pos = friendList[i]["memo"].toRealStr().indexOf(srchKey);
					if(pos != -1) {
						strHTML += '<span>' + friendList[i]["memo"].toRealStr().substr(0, pos).toInnerHTML() +
							"<b>" + srchKey.toInnerHTML() + "</b>" + friendList[i]["memo"].toRealStr().substr(pos+srchKey.length).toInnerHTML() + '</span>';
					}
					else {
						strHTML += '<span>'+friendList[i]["memo"].toRealStr().toInnerHTML()+'</span>';
					}
				}

				var pos = friendList[i]["name"].toRealStr().indexOf(srchKey);
				if(pos != -1) {
					strHTML += '<span>' + (friendList[i]["memo"] ? '[' : '') + friendList[i]["name"].toRealStr().substr(0, pos).toInnerHTML() +
						"<b>" + srchKey.toInnerHTML() + "</b>" + friendList[i]["name"].toRealStr().substr(pos+srchKey.length).toInnerHTML() + (friendList[i]["memo"] ? ']' : '') +  '</span>';
				} else {
					strHTML += '<span>'+ (friendList[i]["memo"] ? '[' : '') + friendList[i]["name"]+ (friendList[i]["memo"] ? ']' : '') + '</span>';
				}

				strHTML += '(<span>'+(friendList[i]["uin"]+"").replace(srchKey, "<b>"+srchKey+"</b>")+'</span>)';
				strHTML += '</li>';
			}
			strHTML += '</ul>';
			return strHTML;
		},

		/**
		 * 获取好友列表
		 * @param  {Function} callback
		 */
		_getting: false,
		_lastResult: 0,
		getFriendList: function(callback){
			var _this = this;

			if(this._getting){
				this.showTip('正在加载好友信息');
				setTimeout(function(){
					_this.getFriendList(callback);
				}, 100);
				return;
			}
			if(this._lastResult === -1){
				this.hideTip();
				return;
			} else if(this._lastResult == 1){
				callback(this.friendList);
				return;
			}

			this._getting = true;
			QZONE.FP.getFriendList(QZONE.FP.getQzoneConfig().loginUin, function(data){
				_this.hideTip();
				_this._getting = false;
				if(!data) {
					_this._lastResult = -1;
					_this.showTip('网络繁忙，暂时无法加载好友信息');
					return;
				}
				_this._lastResult = 1;
				for(var i=0; i<data.items.length; i++){	//转换到memo字段
					data.items[i].memo = data.items[i].realname;
				}
				counvertMemoToPinYin(data.items, function(result){
					_this.friendList = result;
					callback(result);
				});
			});
		}
	});
	ve.plugin.register('qzonemention', VEditor.plugin.QzoneMention);

	/**
	 * 转换用户数据到拼音字段
	 * @param  {Array}   userList
	 * @param  {Function} callback
	 */
	var counvertMemoToPinYin = function(userList, callback){
		var handler = function(){
			for(var i=0; i<userList.length; i++){
				userList[i]['namePY'] = QZFL.widget.pinyin.convertPYs(userList[i]["name"]).join("\n");
				userList[i]['memoPY'] = QZFL.widget.pinyin.convertPYs(userList[i]["memo"]).join("\n");
			}
			callback(userList);
		}
		if(QZFL.widget.pinyin) {
			handler();
		} else {
			var jsLoader = new QZFL.JsLoader();
			jsLoader.onload = function(){handler();};
			jsLoader.load('http://' + parent.siDomain + '/qzone/v5/qzonesoso/js/pinyin.js', document, 'UTF-8');
			jsLoader = null;
		}
	};


	/**
	 * 检测空格的索引号，包括UTF8空格
	 * @param  {String} str
	 * @return {Number}
	 */
	var indexOfSpace = function(str){
		var p1 = str.indexOf(' ');
		var p2 = str.indexOf(UTF8_SPACE);

		if(p1 >=0 && p2 >= 0){
			return Math.min(p1, p2);
		} else {
			return Math.max(p1, p2);
		}
	};

	/**
	 * 是否忽略当前链接节点
	 * @param  {Range} rng
	 * @return {Boolean}
	 */
	var ignoreLinkNode = function(rng){
		var sc = rng.startContainer,
			so = rng.startOffset,
			chkNode = null;

		if(sc.nodeType == 1){
			chkNode = !so ? sc : sc.childNodes[so];
		} else if(sc.nodeType == 3){
			chkNode = sc.parentNode;
		}
		while(chkNode && chkNode.nodeType == 3){
			chkNode = chkNode.previousSibling || chkNode.parentNode;
		}
		return ve.dom.isLinkNode(chkNode);
	};

	//非分隔节点
	var isTextNode = function(n){
		return n && (n.nodeType == 3 || n.style.display.toLowerCase() == 'none');
	};

	/**
	 * 是否为@链接
	 * @param  {DOM}  n
	 * @return {Boolean}
	 */
	var isMentionLink = function(n){
		return n && n.nodeType == 1 && n.getAttribute('uin');
	}

	/**
	 * 从Range左边获取字符串
	 * @param {Range} rng
	 * @return {String}
	 */
	var _getStrLeft = function(rng){
		var sc = rng.startContainer,
			so = rng.startOffset,
			bn = null,
			retVal = '';

		if(sc.nodeType == 1){
			if(!so){
				return '';
			} else {
				var n = sc.childNodes[so-1];
				while(n && n.nodeType == 3){
					retVal = n.nodeValue + retVal;
					n = n.previousSibling;
				}
			}
		} else if(sc.nodeType == 3){
			retVal = sc.nodeValue.substring(0, so);
			var n = sc.previousSibling;
			while(n && n.nodeType == 3){
				retVal = n.nodeValue + retVal;
				n = n.previousSibling;
			}
		}
		return retVal;
	};

	/**
	 * 从左右字符串里面获取@字符串
	 * @param  {String} pStr 左边字符串
	 * @param  {String} nStr 右边字符串
	 * @return {String}
	 */
	var _parseMentionStr = function(pStr, nStr){
		var atIdx = pStr.lastIndexOf('@');
		pStr = pStr.substring(atIdx);
		if(atIdx >=0 && indexOfSpace(pStr) < 0){	//前置字串不需要检测空格
			var endIdx = nStr.length;
			var _s;
			var p1 = indexOfSpace(nStr),
				p2 = nStr.indexOf('@');
			if(p1>=0 && p2>=0){
				_s = Math.min(p1, p2);
			} else {
				_s = Math.max(p1, p2);
			}
			if(_s >= 0){
				endIdx = _s;
			}
			//这里trim是为了去除 blankChar
			//去除'主要是为了QQ拼音输入这种，会插入单引号
			return ve.string.trim(pStr + nStr.substring(0, endIdx)).replace(/\'/g,'');
		}
		return '';
	};

	/**
	 * 清理非@功能需要的字符
	 * @param  {DOM} start 开始节点
	 * @param  {String} ltr   方向
	 */
	var cutStr = function(start, ltr){
		var node = start[ltr];
		while(node){
			if(node.nodeType == 3){
				if(node.nodeValue.lastIndexOf('@') >= 0){
					var pos = node.nodeValue.lastIndexOf('@');
					node.nodeValue = node.nodeValue.substring(0,pos);
					break;
				} else {
					if(ltr == 'nextSibling' && indexOfSpace(node.nodeValue) >= 0){
						node.nodeValue = node.nodeValue.substring(0, indexOfSpace(node.nodeValue));
						break;
					} else {
						var tmp = node[ltr];
						ve.dom.remove(node);
						node = tmp;
					}
				}
			} else {
				break;
			}
		}
	};


	/** 获取用户删除的@用户列表
	 * @param  {Array} curUserList
	 * @param  {Array} _lastUserList
	 * @return {Array}
	 */
	var getRemovedUserList = function(curUserList, _lastUserList){
		var result = [];
		for(var i=0; i<_lastUserList.length; i++){
			var found = false;
			for(var j=0; j<curUserList.length; j++){
				if(curUserList[j] == _lastUserList[i]){
					found = true;
					break;
				}
			}
			if(!found){
				result.push(_lastUserList[i]);
			}
		}
		return result;
	}

	/**
	 * 获取用户添加的@用户列表
	 * @param  {Array} curUserList
	 * @param  {Array} _lastUserList
	 * @return {Array}
	 */
	var getAddedUserList = function(curUserList, _lastUserList){
		var result = [];
		for(var i=0; i<curUserList.length; i++){
			var found = false;
			for(var j=0; j<_lastUserList.length; j++){
				if(curUserList[i] == _lastUserList[j]){
					found = true;
					break;
				}
			}
			if(!found){
				result.push(curUserList[i]);
			}
		}
		return result;
	};
})(VEditor);