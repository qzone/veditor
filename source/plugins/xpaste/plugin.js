/**
 * 粘贴处理
 * TODO 里面的大部分的正则都没有做严格匹配，部分代码包含空间逻辑
 * 例如：<\w+[^>]+\s+style=" 这个里面的 ^>是不太准的
 */
(function(ve) {
	//清理内容CACHE，提高速度
	var FILTED_CONTENT_CACHE = {};

	//可移除标签（包含内容）
	var REMOVEABLE_TAGS_N_CONTENT = /^(style|comment|select|option|script|title|head|button)/i;

	//可移除标签（不包含内容）
	var REMOVEABLE_TAGS = /^(!doctype|html|link|base|body|pre|input|frame|frameset|iframe|ilayer|layer|meta|textarea|form|area|bgsound|player|applet|xml)/i;

	//内联方法
	var HIGHT_RISK_INLINE_EVENT = /^(onmouseover|onclick|onload|onmousemove|onmouseout)/i;

	//word class命中
	var WORD_CLASS = /(MsoListParagraph|MsoNormal|msocomoff|MsoCommentReference|MsoCommentText|msocomtxt|blog_details_)/i;

	//class白名单
	var CLASS_WHITELIST = /^(blog_video|blog_music|blog_music_multiple|blog_flash|blog_album)$/i;

	//ID白名单
	var ID_WHITELIST = /^(musicFlash\w*)$/i;

	//内部ID
	var INNER_ID_LIST = /^(veditor_\w*)$/i;

	//内联样式
	var REMOVEABLE_STYLE_KEY = /^(text-autospace|background-color|mso-|layout-grid)/i;
	var REMOVEABLE_STYLE_VAL = /expression/i;

	//忽略过滤属性的标签
	var IGNORE_ATTR_BY_TAG = /^(param|embed|object|video|audio)/i;

	//属性清理
	var REMOVEABLE_ATTR_KEY = /^(lang|eventsListUID)/i;

	//标签判定，该判定不严谨，仅用于标签的内容判定，对于多层嵌套的没有处理
	var TAG_JUDGE = /<([^>\s]+)([^>]*)>([\s\S]*?)<\/\2>(.*)/g;

	//属性切割
	//TODO: 这个切割隔不了 <a title="<img src=Rz!>" contentEditable="false" href="http://user.qzone.qq.com/528968/" target="_blank" uin="528968" unselectable="on">
	var ATTR_SEP_EXP = /([\w\-:.]+)(?:(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s>]+)))|(?=\s|$))/g;

	//是否清除行高
	var SW_CLEAR_LINE_HEIGHT = false;

	//是否清理id
	var SW_CLEAR_INNER_ID = true;

	//隐藏标签（待清理）
	var COLL_HIDDEN_TAGS = {};

	//是否保留背景色
	//hardcode
	var KEEP_BGC = window.getParameter ? (window.getParameter('synDataKey') == 't2bContent' || window.getParameter('isUgcBlog')) : false;

	ve.lang.Class('VEditor.plugin.XPaste', {
		editor:null,
		url: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			//添加clearContent外部接口
			editor.cleanString = function(str){
				str = _this.cleanString(str);
				return str;
			};

			//绑定getContent
			editor.onGetContent.add(function(str){
				SW_CLEAR_LINE_HEIGHT = true;
				COLL_HIDDEN_TAGS = {'img':true};
				str = _this.cleanString(str);
				SW_CLEAR_LINE_HEIGHT = false;
				str = filteElement(COLL_HIDDEN_TAGS, str)
				COLL_HIDDEN_TAGS = {};
				return str;
			}, true);

			//绑定粘贴，粘贴时不处理行高
			editor.onAfterPaste.add(function(){
				SW_CLEAR_INNER_ID = false;
				_this.onAfterPasteHandler();
				SW_CLEAR_INNER_ID = true;
			});
		},

		onAfterPasteHandler: function(){
			var body = this.editor.getBody();
			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark(true, true);
			var str = this.cleanString(body.innerHTML) || this.editor.getEmptyHelperHtml();
			body.innerHTML = str;
			rng.moveToBookmark(bookmark);
			rng.select(true);

			this.editor.updateLastVERange();
		},

		/**
		 * HTML5
		 * 这里禁用webkit是因为webkit如果调用粘贴数据，会被认作为外部调用，
		 * 粘贴内容自动啪上浏览器computed样式
		 *
		onPaste: function(e){
			if(e && e.clipboardData && !ve.ua.webkit){
				str = e.clipboardData.getData('text/html');
				if(str){
					str = this.cleanString(str);
					this.editor.insertHtml({content:str});
					ve.dom.event.preventDefault(e);
				}
			}
		},
		**/

		/**
		 * 清理内容
		 * @param {String} source
		 * @return {String}
		 **/
		cleanString: function(source){
			var _this = this;
			if(FILTED_CONTENT_CACHE[source] !== undefined){
				return FILTED_CONTENT_CACHE[source];
			}

			//临时控制
			KEEP_BGC = this.editor.conf.keepBGC || KEEP_BGC;

			//去换行、去评论、去ie条件方法、去xml标记
			var str = processStrByReg(source, [
				/[\r]/gi,
				/[\n]/gi,
				/<![^>]+>/g,
				/<\??xml[^>]*>/gi,
				/<\/xml>/gi,
				/(\&nbsp;)*$/gi
			]);

			//清理配对标签
			str = this.cleanPairTags(str);

			//office图片保留
			//这里只有ie6需要，其他浏览器已经自动生成了<img>标签
			if(ve.ua.ie && ve.ua.ie <= 8){
				str = processStrByReg(str, [[/<v\:imagedata\s([^>]*)>/gi]], this.convOfficeImg);
			}

			//单标签过滤
			str = processStrByReg(str, [[/<\/?([\w|\:]+)[^>]*>/gi]], this.cleanTag);

			//属性清理
			str = processStrByReg(str, [[/<(\w+)\s+([^>]+)>/gi]], function(){
				var args = ve.lang.arg2Arr(arguments);
				return _this.onAttrMatch.apply(_this, args);
			});

			FILTED_CONTENT_CACHE[source] = str;
			return str;
		},

		/**
		 * 清理标签对
		 * @param {String} str
		 * @return {String}
		**/
		cleanPairTags: function(str){
			var _this = this;
			str = str.replace(TAG_JUDGE, function(){
				var args = arguments;
				var match = args[0],
					tag = args[1],
					attr = args[2],
					content = args[3],
					res = args[4];

				if(!ve.dtd[tag.toLowerCase()]){
					return match;
				}

				if(regClone(TAG_JUDGE, 'g').test(res)){
					res = _this.cleanPairTags(res);
				}

				if(REMOVEABLE_TAGS_N_CONTENT.test(tag)){
					//console.log('标签+内容被删除', tag);
					return res;
				} else {
					if(regClone(TAG_JUDGE, 'g').test(content)){
						content = _this.cleanPairTags(content);
					}
					return '<'+tag+attr+'>'+content+'</'+tag+'>'+res;
				}
			});

			//移除没有style属性且没有内容的空div
			str = str.replace(/(<div)([^>]*)(><\/div>)/gi, function(match, p1, attr, p2){
				if(!attr || attr.indexOf('style') < 0){
					//console.log('空div被移除', match);
					return '<br/>';
				} else {
					return p1 + attr + p2;
				}
			});
			return str;
		},

		/**
		 * 修正office图片标签内容
		 * @param {String} match
		 * @param {String} props
		 * @return {String}
		 **/
		convOfficeImg: function(match, props){
			var tmp = /(^|\s)o\:title="([^"]*)"/i.exec(props);
			var title = tmp ? tmp[2] : '';
			var tmp = /(^|\s)src="([^"]*)"/i.exec(props);
			var src = tmp ? tmp[2] : '';
			if(src){
				return '<img src="'+src+'"'+(title ? ' title="'+title+'">' : '>');
			}
			return '';	//match 无法转换的就删除
		},

		/**
		 * 清理标签
		 * @param {String} match
		 * @param {String} tag
		 * @return {String}
		 **/
		cleanTag: function(match, tag){
			if(REMOVEABLE_TAGS.test(tag)){
				//console.log('指定标签被删除', tag);
				return '';
			}
			if(tag.substring(0, 1) != '$' && !ve.dtd[tag.toLowerCase()] && tag.toLowerCase() != 'marquee'){
				//console.log('非html标签被删除',tag);
				return '';
			}
			return match;
		},

		/**
		 * 属性匹配
		 * @param {String} match 命中整个字串
		 * @param {String} tag 标签
		 * @param {String} attrStr 属性字串
		 * @return {String}
		 **/
		onAttrMatch: function(match, tag, attrStr){
			if(IGNORE_ATTR_BY_TAG.test(tag)){
				//console.log('>>>>>>>属性不过滤', tag);
				return match;
			}

			var arr = (' '+attrStr).match(ATTR_SEP_EXP);
			var keepAttrs = {};

			if(arr && arr.length){
				for(var i=0; i<arr.length; i++){
					var spos = arr[i].indexOf('=');
					var key = arr[i].substring(0, spos);
					var val = trimAttr(arr[i].substring(spos+1)) || '';

					switch(key.toLowerCase()){
						case 'id':
							val = this.onIdFilter(tag, val);
							break;

						case 'class':
							val = this.onClassFilter(tag, val);
							break;

						case 'style':
							val = this.onStyleFilter(tag, val);
							break;

						default:
							val = this.onCustomAttrFilter(tag, key.toLowerCase(), val);
					}
					keepAttrs[key] = val;
				}
			}
			var newAttrStr = buildAttrStr(keepAttrs);
			return '<'+tag+newAttrStr+'>';
		},

		/**
		 * 自定义属性过滤
		 * 需要对额外属性进行过滤的，可以放到这里来做
		 * @deprecated 这里居然为了空间的架构，做了表情域名矫正
		 * @param {String} tag
		 * @param {String} key
		 * @param {String} val
		 * @return {String}
		 **/
		onCustomAttrFilter: function(tag, key, val){
			//直出页表情粘贴矫正!
			if(tag.toLowerCase() == 'img' && key.toLowerCase() == 'src'){
				if(val.toLowerCase().indexOf('http://user.qzone.qq.com/qzone/em/') == 0){
					return val.replace(/(http:\/\/)([\w\.]+)(\/)/ig, function($0, $1, $2, $3){
						return $1 + 'i.gtimg.cn'+$3;
					});
				}
			}

			if(HIGHT_RISK_INLINE_EVENT.test(key) || //内联事件过滤
				REMOVEABLE_ATTR_KEY.test(key)		//额外属性过滤
			){
				//console.log('自定义属性被删除', key);
				return null;
			}
			return val;
		},

		/**
		 * id过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		 **/
		onIdFilter: function(tag, id){
			id = ve.string.trim(id);
			if(INNER_ID_LIST.test(id)){
				return SW_CLEAR_INNER_ID ? null : id;
			}
			if(ID_WHITELIST.test(id)){
				return id;
			}
			return null;
		},

		/**
		 * class过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		**/
		onClassFilter: function(tag, classStr){
			var clsArr = classStr.split(' ');
			var result = [];
			ve.lang.each(clsArr, function(cls){
				if(CLASS_WHITELIST.test(ve.string.trim(cls))){
					result.push(cls);
				}
			});
			return result.length ? result.join(' ') : null;
		},

		/**
		 * 内联样式过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		**/
		onStyleFilter: function(tag, styleStr){
			if(!ve.string.trim(styleStr)){
				return styleStr;
			}

			var keepStyles = {};
			var a = splitStyleStr(styleStr);

			//构造style字串
			var _buildStyleStr = function(styles){
				var a = [];
				for(var i in styles){
					if(styles[i]){
						a.push(i + ':'+styles[i]+'');
					}
				}
				return a.join(';');
			};

			var addBGTransparent;
			for(var i=0; i<a.length; i++){
				var str = ve.string.trim(a[i]);
				var pos = str.indexOf(':');
				var key = ve.string.trim(str.substring(0, pos));
				var val = ve.string.trim(str.substring(pos+1));

				//fix 引号在ie下面的转义问题
				if(key.toLowerCase().indexOf('background') == 0){
					val = val.replace(/\"/g, '');
				}

				//只过滤背景色
				if(key.toLowerCase() == 'background' && !KEEP_BGC){
					if(/url|position|repeat/i.test(val)){
						addBGTransparent = true;
					} else {
						val = null;
					}
				}

				//过滤none的结构
				if(key.toLowerCase() == 'display' && val.toLowerCase().indexOf('none') >=0){
					COLL_HIDDEN_TAGS[tag] = true;
				}

				//过滤overflow*:auto, scroll
				if(key.toLowerCase().indexOf('overflow')>=0 && (val.toLowerCase().indexOf('auto') >= 0 || val.toLowerCase().indexOf('scroll') >=0)){
					val = null;
				}

				else if(REMOVEABLE_STYLE_KEY.test(key)||
					REMOVEABLE_STYLE_VAL.test(val) ||
					(SW_CLEAR_LINE_HEIGHT && /^line-height/i.test(key))
				){
					//console.log('删除样式 ',key);
					val = null;
				}
				keepStyles[key] = val;
			}
			if(addBGTransparent){
				keepStyles['background-color'] = 'transparent';
			}
			return _buildStyleStr(keepStyles);
		}
	});
	ve.plugin.register('xpaste', VEditor.plugin.XPaste);

	/**
	 * 去除属性两边的引号、空白字符
	 * @param {String} attr
	 * @return {String}
	 */
	var trimAttr = function(attr){
		attr = ve.string.trim(attr);
		if(/^["|'](.*)['|"]$/.test(attr)){
			return attr.substring(1, attr.length-1);
		}
		return attr;
	};

	/**
	 * 构造attr字串
	 * @param {Array} attrs
	 * @return {String}
	 */
	var buildAttrStr = function(attrs){
		var a = [];
		for(var i in attrs){
			if((i.toLowerCase() != 'class' || i.toLowerCase() != 'style') && !attrs[i]){
				//class、style不允许空串
			}
			else if(attrs[i] === null || attrs[i] === undefined){
				a.push(i);
			} else {
				a.push(i + '="'+attrs[i].replace(/([^\\])"/g, '$1\\"')+'"');
			}
		}
		return (a.length ? ' ' : '')+a.join(' ');
	};

	/**
	 * 处理正则规则
	 * @param {String} str
	 * @param {Array} regItems
	 * @param {Function} onMatch
	 **/
	var processStrByReg = function(str, regItems, onMatch){
		var _this = this;
		for(var i=0; i<regItems.length; i++){
			var v = regItems[i];
			if (v.constructor == RegExp){
				str = str.replace(v, function(){
					if(onMatch){
						return onMatch.apply(_this, arguments);
					}
					return '';
				});
			} else {
				str = str.replace(v[0], function(){
					if(onMatch){
						var arg = arguments;
						return onMatch.apply(_this, arg);
					}
					return arguments[v[1].substring(1)];
					//return v[1]; 这里有点问题。 如果返回$1这种格式貌似不生效
				});
			}
		}
		return str;
	};

	/**
	 * 正则克隆
	 * @param {RegExp} reg
	 * @param {String} option
	 * @return {RegExp}
	 **/
	var regClone = function(reg, option){
		return new RegExp(reg.source, option);
	};

	/**
	 * 分隔属性字符串
	 * @param {String} str
	 * @return {String}
	 **/
	var splitStyleStr = function(str){
		str = str.replace(/&amp;/g, '_veditor_sep_');
		var arr = str.split(';');
		var result = [];
		ve.lang.each(arr, function(item){
			result.push(item.replace(/_veditor_sep_/g, '&amp;'));
		});
		return result;
	};

	/**
	 * 过滤元素：去除隐藏元素，修正本地图片
	 * @param object tags
	 * @param {String} str source string
	 * @return {String};
	 **/
	var filteElement = (function(){
		var _TMP_DIV;
		return function(tags, str){
			if(!_TMP_DIV){
				_TMP_DIV = document.createElement('div');
			}
			_TMP_DIV.innerHTML = str;
			var hit = false;
			ve.lang.each(tags, function(val, tag){
				var nodeList = _TMP_DIV.getElementsByTagName(tag);
				for(var i=nodeList.length-1; i>=0; i--){
					var n = nodeList[i];
					if(n && n.parentNode){
						if(isLocalImg(n) || isSafariTmpImg(n)){
							n.removeAttribute('src');
							n.title = '';
							n.alt = isSafariTmpImg(n) ? '本地图片':'本地图片，请重新上传';
							hit = true;
						}
						else if(n.style.display.toLowerCase() == 'none'){
							ve.dom.remove(n);
							hit = true;
						}
					}
				}
			});
			return hit ? _TMP_DIV.innerHTML : str;
		}
	})();

	/**
	 * safari tmp file
	 * @param {DOM} node
	 * @return {Boolean}
	 */
	var isSafariTmpImg = function(node){
		return node && node.tagName == 'IMG' && /^webkit-fake-url\:/i.test(node.src);
	};

	/**
	 * 本地图片
	 * @param {DOM} node
	 * @return {Boolean}
	 **/
	var isLocalImg = function(node){
		return node && node.tagName == 'IMG' && /^file\:/i.test(node.src);
	};
}) (VEditor);