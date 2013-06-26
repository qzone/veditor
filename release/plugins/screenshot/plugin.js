/**
 * 截屏功能（依赖控件）
 * @author sasumi
 * @build 20130506
 */
(function(ve){
	var LOGIN_UIN = QZONE.FP._t.g_iLoginUin,		//登录用户UIN
		IS_ALPHA = /^(361591257|1459219|370606334|764920671|1411721128|906714072|95440569|22223420)$/.test(LOGIN_UIN),			//放量
		BLOG_TYPE = 7,								//传输到私密相册
		PLUGIN_INSTALL_URL = 'http://mail.qq.com/cgi-bin/readtemplate?t=browser_addon&check=false',

		UPLOADING_CLASS = 'image_uploading',		//上传中 img class
		UPLOAD_REPEAT_CLASS= 'image_reupload',		//重新上传

		SW_UPLOADING = false,			//是否正在上床中
		MAX_UPLOAD_TIME = 20000,		//最大上传时间
		UPLOAD_QUEUE = 1,				//队列中
		UPLOAD_SENDING = 2,				//上传中
		UPLOAD_DONE = 3,				//上传成功
		UPLOAD_ERROR = 4,				//上传错误
		UPLOAD_TIMEOUT = 5,				//上传超时

		UPLOAD_TIMER,					//上传计时器
		SW_QUEUE_UPLOADING = false,		//队列还在上床中
		QUEUE_UPLOAD_HASH = {};			//队列

	ve.lang.Class('VEditor.plugin.ScreenShot', {
		editor: null,						//编辑器对象
		DIYClipBoardImg: 0,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.createButton('screen', {
				'class': 'veScreen',
				title: '截屏',
				cmd: function(){_this.doCapture();}
			});

			//粘贴截图
			this.editor.onPaste.add(function(e){
				_this.pasteEvent(e);
			});

			//右键
			this.editor.onInitComplete.add(function(){
				ve.dom.event.add(_this.editor.getDoc(), 'contextmenu', function(){
					_this.updateContextMenu();
				});
				_this.editor.onKeyDown.add(function(e) {
					_this.pasteEvent(e);
				});
			});

			//图片重新上传
			this.editor.onClick.add(function(e){
				var tag = ve.dom.event.getTarget(e);
				if(tag.nodeName == 'IMG' && ve.dom.hasClass(tag, UPLOAD_REPEAT_CLASS)){
					_this.uploadOne(tag);
				}
			});

			//上传本地图片
			this.editor.onAfterPaste.addLast(function(){
				_this.uploadTempFile();
			});

			//io接口：判断是否正在上传图片
			this.editor.addIO('isUploadingPic', function(){
				return _this.isUploading();
			});
		},

		/**
		 * 更新上传队列 QUEUE_UPLOAD_HASH
		 * @descrption 这里做了去重了（根据 全局_UNIQUIE_HASH），和更新已经上传的文件的状态
		**/
		updateUploadHash: function(){
			var _this = this;
			var imgs = this.editor.getDoc().getElementsByTagName('img');

			var _isDone = function(eventType){
				return eventType && eventType != UPLOAD_QUEUE && eventType != UPLOAD_SENDING;
			};

			ve.lang.each(imgs, function(img){
				if(isLocalFile(img.src)){
					var item = QUEUE_UPLOAD_HASH[img.src];
					var state = _isDone(item) ? UPLOAD_DONE : UPLOAD_QUEUE;
					_this.updateOneImgUploadState(img, item, state);
					if(!item){
						QUEUE_UPLOAD_HASH[img.src] = UPLOAD_QUEUE;
					}
				}
			});
		},

		/**
		 * 更新一个图片状态
		 * @param dom img
		 * @param string succSrc
		 * @param number eventType
		 **/
		updateOneImgUploadState: function(img, succSrc, eventType, p1, p2, p3){
			switch(eventType){
				case UPLOAD_DONE:
					img.title = '';
					img.src = succSrc;
					img.className = '';
					img.alt = '';
					break;

				case UPLOAD_ERROR:
					img.title = '上传失败';
					img.alt = '';
					img.className = UPLOAD_REPEAT_CLASS;
					break;

				default:
					img.className = UPLOADING_CLASS;
					img.title = '正在上传中,请稍候...';
					img.alt = '';
					break;
			}
		},

		/**
		 * 更新图片上传状态
		 * @param string localSrc
		 * @param string succSrc
		 * @param number eventType
		 **/
		updateImgUploadState: function(localSrc, succSrc, eventType, p1, p2, p3){
			var _this = this;
			ve.lang.each(getImgsBySrc(localSrc, this.editor.getDoc()), function(img){
				_this.updateOneImgUploadState(img, succSrc, eventType, p1, p2, p3);
			});
		},

		/**
		 * 上传temp中的文件
		 **/
		uploadTempFile: function(){
			if(!IS_ALPHA){
				return;
			}

			var uploader = getCaptureObject('Uploader');
			if(!uploader){
				this.showInstallCaptureObjectGuild();
				return;
			}

			//ie报错，所以和这里需要try
			if(verComp('1.0.1.54', uploader.Version) < 0){
				this.editor.showStatusbar('安装最新版截屏插件可以自动上传word里面的图片，<a href="'+PLUGIN_INSTALL_URL+'" target="_blank">请点击这里进行安装</a>');
				return;
			}

			this.updateUploadHash();

			//队列还在跑
			if(SW_QUEUE_UPLOADING){
				return;
			}

			this._uploadTempFileQueue();
		},

		/**
		 * 是否正在上传中
		 **/
		isUploading: function(){
			return SW_UPLOADING;
		},

		/**
		 * 只更新一张图
		 * @param dom img
		 **/
		uploadOne: function(img){
			var src = img.src,
				_this = this;

			this.updateImgUploadState(src, null, UPLOAD_SENDING);

			if(isLocalFile(src)){
				_this.uploadPic(src, function(uploader, succSrc, eventType, p1, p2, p3){
					_this.updateImgUploadState(src, succSrc, eventType, p1, p2, p3);
					if(eventType != UPLOAD_QUEUE){
						QUEUE_UPLOAD_HASH[src] = succSrc || eventType;
					}
				});
			}
		},

		/**
		 * 进行队列
		 **/
		_uploadTempFileQueue: function(){
			var _this = this;

			//get one
			var src = null;
			ve.lang.each(QUEUE_UPLOAD_HASH, function(item, k){
				if(item == UPLOAD_QUEUE){
					src = k;
					return false;
				}
			});
			if(src){
				_this.uploadPic(src, function(uploader, succSrc, eventType, p1, p2, p3){
					_this.updateImgUploadState(src, succSrc, eventType, p1, p2, p3);
					if(eventType != UPLOAD_QUEUE){
						QUEUE_UPLOAD_HASH[src] = succSrc || eventType;
						_this._uploadTempFileQueue();		//upload rest
					}
				});
			} else {
				SW_QUEUE_UPLOADING = false;
			}
		},

		/**
		 * 截屏
		 */
		doCapture: function(){
			var _this = this;
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				this.showInstallCaptureObjectGuild();
				return;
			}

			capObj.OnCaptureFinished = function(){
				capObj.BringToFront(window);
				var fileID = capObj.SaveClipBoardBmpToFile(1);
				_this.uploadPic(fileID, ve.lang.bind(_this,_this.onPastingImg));
			};
			capObj.DoCapture();
		},

		/**
		 * 安装插件
		 */
		showInstallCaptureObjectGuild: function(){
			this.editor.showStatusbar('您的浏览器还没有安装截屏插件，<a href="'+PLUGIN_INSTALL_URL+'" target="_blank">请点击这里进行安装</a>');
		},

		/**
		 * 更新右键菜单
		 * 这里针对IE有效
		 */
		updateContextMenu: function(){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			var fileID = capObj.SaveClipBoardBmpToFile(1);
			if(fileID){
				this._tempFileID = fileID;
			}
			if(capObj.IsClipBoardImage && window.clipboardData){//系统剪切板有图片
				window.clipboardData.setData("Text","TencentMailPlugin_QZONE");
				this.DIYClipBoardImg = 1;
			}
		},

		/**
		 * 绑定粘贴事件
		 * 这里要接收两种事件，一种是keydown(ctrl+v)，另外一种是粘贴事件（鼠标右键粘贴）
		 * @param {Object} e
		 */
		pasteEvent: function(e){
			e = e || window.event;

			//第一次是只有一个ctrl，需要跳过
			if(e.ctrlKey && e.keyCode == 17 && e.type != 'paste'){
				return;
			}

			if (e.ctrlKey && (e.keyCode == 86)||(e.keyCode == 118) || (e.keyCode == 59)){
				var capObj = getCaptureObject('ScreenCapture');
				if(!!capObj && capObj.IsClipBoardImage){//系统剪切板有图片
					this.editorPaste(e);
					return false;
				}else{
					return true;
				}
		    } else if(e.type == 'paste'){
				var capObj = getCaptureObject('ScreenCapture');
				//这里的capObj对象有可能IsClipBoardImage==0， 因此加上一个 _tmpFileID作为判断
				if(!!capObj && (capObj.IsClipBoardImage || this._tempFileID)){//系统剪切板有图片
					this.editorPaste(e);
					return false;
				}else{
					return true;
				}
			}

			if (e.ctrlKey && (e.keyCode == 67)||(e.keyCode == 99)){
				this.DIYClipBoardImg = 0;
		    }
		},

		doPaste: function(){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			if(capObj.IsClipBoardImage){
				capObj.BringToFront(window);
				var fileID = capObj.SaveClipBoardBmpToFile(1);
				this.uploadPic(fileID, ve.lang.bind(this, this.onPastingImg));
			}

			else if(this.DIYClipBoardImg==1){
				capObj.BringToFront(window);
				var fileID = this._tempFileID;
				this.uploadPic(fileID, ve.lang.bind(this, this.onPastingImg));
			}

			return true;
		},

		/**
		 * 粘贴图片处理回调
		 * @param string srcStr 源数据
		 * @param string succSrc 成功的图片src
		 * @param number eventType 事件类型
		 * @param number p1 百分比
		 * @param number p2 百分比
		 * @param number p3 待扩展
		 **/
		onPastingImg: function(srcStr, succSrc, eventType, p1, p2, p3){
			switch(eventType){
				//上传失败
				case UPLOAD_ERROR:
					QZONE.FP.showMsgbox('处理截图预览时遇到错误，请稍后再试。',5,3000);
					break;

				//上传中
				case UPLOAD_SENDING:
					QZONE.FP.showMsgbox('正在处理图片预览，请稍候 : ' + Math.round(p1/p2*100) + '%',6, 3000);
					break;

				//上传完成
				case UPLOAD_DONE:
					var html = '<img src="'+succSrc+'" alt="图片"/>';
					this.editor.insertHtml({content:html});
			}
		},

		/**
		 * 上传图片
		 * @param string fileID
		 * @param function callback 上传回调，参数：fileID, succSrc, eventType, p1, p2, p3
		 */
		uploadPic: function(fileID, callback){
			if(!fileID){
				return;
			}

			var _this = this;
			var uploader = getCaptureObject('Uploader');
			if(!uploader){
				this.showInstallCaptureObjectGuild();
				return;
			}

			//获取上传路径
			getUploadUrl(function(uploadUrl){
				if(SW_UPLOADING){
					_this.editor.showStatusbar('正在上传文件，请稍候...');
					return;
				}
				SW_UPLOADING = true;

				var _reset = function(){
					uploader.StopUpload();
					clearTimeout(UPLOAD_TIMER);
					SW_UPLOADING = false;
				};

				//超时
				UPLOAD_TIMER = setTimeout(function(){
					_reset();
					callback(fileID, null, UPLOAD_TIMEOUT);
				}, MAX_UPLOAD_TIME);

				uploader.OnEvent = function(_tmp, eventType, p1, p2, p3){
					var succSrc = '';
					if(eventType == UPLOAD_DONE){
						var succSrc = _this.getUploadedSrc(uploader);
						if(!succSrc){
							eventType = UPLOAD_ERROR;
						};
					}
					if(eventType == UPLOAD_DONE || eventType == UPLOAD_ERROR){
						_this.editor.hideStatusbar();
						_reset();
					}
					callback(fileID, succSrc, eventType, p1, p2, p3);
				};

				uploader.URL = uploadUrl;
				uploader.StopUpload();
				uploader.ClearHeaders();
				uploader.ClearFormItems();
				uploader.AddHeader('cookie',document.cookie);

				if(isLocalFile(fileID)){
					fileID = convWinDS(fileID);
					var s = uploader.AddTempFileItem('picname2', fileID);	//非合法tmp文件
					if(!s){
						_reset();
						return;
					}
				} else {
					uploader.AddFormItem('picname2', 1, 0, fileID);
				}

				uploader.AddFormItem('blogtype',0,0, BLOG_TYPE);
				uploader.AddFormItem('json',0,0,"1");
				uploader.AddFormItem('refer',0,0,'blog');
				uploader.StartUpload();
			}, function(){
				_this.editor.showStatusbar('暂时无法获取您当前的地理位置，请稍后再试。', 3);
			});
		},

		/**
		 * 判断是否上传成功
		 * @param string str
		 * @return mix
		 **/
		getUploadedSrc: function(uploader){
			if(!uploader || !uploader.Response){
				return null;
			}

			var str = uploader.Response;
			var _r = /{.*}/ig;
			if(!str.match(_r)){
				return null;
			}

			var strMsg = '';
			var o = eval("("+str+")");
			if(o.error!=null){
				strMsg = o.error;
				return null;
			}
			return o.url;
		},

		/**
		 * 截图粘贴
		 */
		editorPaste: function(e){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			if(capObj.IsClipBoardImage || (this.DIYClipBoardImg==1 && window.clipboardData.getData("Text") == "TencentMailPlugin_QZONE")){
				this.doPaste();
				ve.dom.event.preventDefault(e);
				return false;
			}
		}
	});
	ve.plugin.register('screenshot', VEditor.plugin.ScreenShot);

	/**
	 * 获取用户上传图片的地址
	 * @param function succCb 成功回调
	 * @param function errCb 失败回调
	 **/
	var getUploadUrl = (function(){
		var uploadUrl = '';
		var checking = false;

		//用户路由信息
		var userLocation = (function(){
			try {
				var cfg = parent.QZONE.dataCenter.get('user_domain_'+LOGIN_UIN);
				return cfg[cfg.domain['default']].u;
			} catch (ex){}
		})();

		/**
		 * 第一道检测
		 * @param function succCb
		 * @param function errCb
		 **/
		var check1 = function(succCb, errCb){
			if(uploadUrl){
				succCb(uploadUrl);
				return;
			} else if(checking){
				setTimeout(function(){check1(succCb, errCb);}, 1000);
				return;
			}

			checking = true;
			if(!userLocation){
				var url = 'http://route.store.qq.com/GetRoute?UIN='+LOGIN_UIN+"&type=json&version=2";
				var JG = new QZFL.JSONGetter(url, void(0), null, "GB2312");
				JG.onSuccess = function(data) {
					checking = false;
					try {userLocation = data[data.domain['default']].u;} catch(e){}
					if(userLocation){
						uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated";
						succCb(uploadUrl);
					} else {
						check2(succCb, errCb);
					}
				};
				JG.onError = JG.onTimeout = function() {
					checking = false;
					check2(succCb, errCb);
				};
				JG.send('photoDomainNameCallback');
			} else {
				uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated"
				succCb(uploadUrl);
			}
		}

		/**
		 * 第二道检测
		 * @param function succCb
		 * @param function errCb
		**/
		var check2 = function(succCb, errCb){
			if(uploadUrl){
				succCb(uploadUrl);
				return;
			}
			if(checking){
				setTimeout(function(){check2(succCb, errCb);}, 1000);
				return;
			}

			checking = true;
			var url = 'http://rb.store.qq.com/GetRoute?UIN='+LOGIN_UIN+"&type=json&version=2";
			var JG = new QZFL.JSONGetter(url, void(0), null, "GB2312");
			JG.onSuccess = function(data) {
				checking = false;
				try {userLocation = data[data.domain['default']].u;} catch(e){}
				if(userLocation){
					uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated";
					succCb(uploadUrl);
				} else {
					errCb();
				}
			};
			JG.onError = JG.onTimeout = function() {
				checking = false;
				errCb();
			};
			JG.send('photoDomainNameCallback');
		};
		return check1;
	})();

	/**
	 * 转换windows路径中的斜杠为反斜杠
	 * @param string path
	 * @return string
	 **/
	var convWinDS = function(path){
		return path.replace(/^file\:\/\/\//i,'__FILE__').replace(/\//g,'\\').replace(/^__FILE__/, 'file:///');
	};

	/**
	 * 根据图片src获取图片dom
	 * @param string src
	 * @return array
	**/
	var getImgsBySrc = function(src, doc){
		var tmp = doc.getElementsByTagName('img');
		var imgs = [];
		ve.lang.each(tmp, function(img){
			if(img.src == src){
				imgs.push(img);
			}
		});
		return imgs;
	};

	/**
	 * 是否为本地文件
	 * 检测格式：file:, C:, D:
	 * @param string filePath
	 * @return bool
	 **/
	var isLocalFile = function(filePath){
		return /^file\:/i.test(filePath) || /^[a-z]\:/i.test(filePath);
	};

	/**
	 * 获取截屏控件对象(单例)
	 * @param string id 支持 Uploader, ScreenCapture
	 * @return object
	 */
	var getCaptureObject = (function(){
		var CAP_HASH = {};
		return function(id){
			if(CAP_HASH[id]){
				return CAP_HASH[id];
			}

			var obj = null;
			try{
				if(ve.ua.ie) {
					obj = new ActiveXObject('TXGYMailActiveX.' + id);
				} else {
					if(!document.getElementById("ffScreenPlugin")) {
						var oDiv = document.createElement('div');
						document.body.appendChild(oDiv);
						if(ve.ua.firefox){	//Firefox用这个type
							oDiv.innerHTML = '<embed id="ffScreenPlugin" type="application/x-tencent-qmail" hidden="true"></embed>';
						} else {
							oDiv.innerHTML = '<embed id="ffScreenPlugin" type="application/x-tencent-qmail-webkit" hidden="true"></embed>';
						}
					}
					var pluginObject = document.getElementById('ffScreenPlugin');
					if(id == "ScreenCapture") {
						obj = pluginObject.CreateScreenCapture();
					}
					else if(id == "Uploader") {
						obj = pluginObject.CreateUploader();
					}
				}
			} catch(ex){
				obj = null;
			}

			CAP_HASH[id] = obj;
			return obj;
		}
	})();

	/**
	 * 版本比较
	 * 规则：1.0 = 1, 1.01 = 1.1, 1.0.2 > 1.0, 1.0.3 < 1.0.3.1，跟国际版本号标准不一致
	 * @param string tagVer
	 * @param string srcVer
	 * @return number 大于0 表示 版本比srcVer大，小于0表示小于，等于表示等于
	 **/
	var verComp = function(tagVer, srcVer){
		var tv = tagVer.split('.');
		var sv = srcVer.split('.');

		for(var i=0, j=Math.max(tv.length, sv.length); i<j; i++){
			var a = parseInt(tv[i] || 0, 10),
				b = parseInt(sv[i] || 0, 10);
			if(a > b){
				return 1;
			} else if(a < b){
				return -1;
			}
		}
		return 0;
	};
})(VEditor);