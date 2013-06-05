(function(ve){
	ve.net = ve.net || {};

	var LOADING = false;
	var FILES_QUEUE = [];
	var FILES_LOAD_MAP = {};

	/**
	 * 检测批量文件是否全部加载完成
	 * @param  {Array} fileInfoList
	 * @return {Boolean}
	 */
	var checkLoaded = function(fileInfoList){
		var loaded = true;
		ve.lang.each(fileInfoList, function(fileInfo){
			if(!FILES_LOAD_MAP[fileInfo.src] ||  FILES_LOAD_MAP[fileInfo.src].status != 3){
				loaded = false;
				return false;
			}
		});
		return loaded;
	};

	/**
	 * 批量加载脚本
	 * @param  {Array} fileInfoList 文件列表信息
	 * @param  {Function} allDoneCb  全部文件加载完成回调
	 */
	var batchLoadScript = function(fileInfoList, allDoneCb){
		if(checkLoaded(fileInfoList)){
			allDoneCb();
			return;
		}

		updateListToQueue(fileInfoList, function(){
			if(checkLoaded(fileInfoList)){
				allDoneCb();
			}
		});

		if(!LOADING){
			loadQueue();
		}
	};

	/**
	 * 更新当前要加载的文件到加载队列中
	 * @param  {Array} fileInfoList
	 * @param {Function} 断续回调
	 */
	var updateListToQueue = function(fileInfoList, tickerCb){
		ve.lang.each(fileInfoList, function(fileInfo){
			if(FILES_LOAD_MAP[fileInfo.src]){
				if(FILES_LOAD_MAP[fileInfo.src].status == 1 || FILES_LOAD_MAP[fileInfo.src].status == 2){
					FILES_LOAD_MAP[fileInfo.src].callbacks.push(tickerCb);
				} else if(FILES_LOAD_MAP[fileInfo.src].status == 3){
					tickerCb();
				} else if(FILES_LOAD_MAP[fileInfo.src].status == 4){
					tickerCb(-1);
				}
			} else {
				FILES_QUEUE.push(fileInfo);
				FILES_LOAD_MAP[fileInfo.src] = {
					status: 1,
					callbacks: [tickerCb]
				};
			}
		});
	};

	/**
	 * 加载队列中的脚本
	 */
	var loadQueue = function(){
		if(FILES_QUEUE.length){
			LOADING = true;
			var fileInfo = FILES_QUEUE.shift();
			FILES_LOAD_MAP[fileInfo.src].status = 2;
			forceLoadScript(fileInfo, function(){
				FILES_LOAD_MAP[fileInfo.src].status = 3;
				ve.lang.each(FILES_LOAD_MAP[fileInfo.src].callbacks, function(cb){
					cb();
				});

				//[fix] 防止ie下面的readyState多执行一次导致这里的callback多次执行
				FILES_LOAD_MAP[fileInfo.src].callbacks = [];
				loadQueue();
			});
		} else {
			LOADING = false;
		}
	};

	/**
	 * 强制加载脚本
	 * @param  {Object|String} fileInfo 文件信息，详细配置参考函数内实现
	 * @param  {Function} sucCb
	 * @return {Boolean}
	 */
	var forceLoadScript = function(fileInfo, sucCb){
		var option = ve.lang.extend(true, {
			src: null,			//文件src
			charset: 'utf-8',	//文件编码
			'window': window
		}, fileInfo);

		if(!option.src){
			return false;
		}

		var doc = option.window.document;
		var docMode = doc.documentMode;
		var s = doc.createElement('script');
		s.setAttribute('charset', option.charset);

		ve.dom.event.add(s, ve.ua.ie && ve.ua.ie < 10 ? 'readystatechange': 'load', function(){
			if(ve.ua.ie && s.readyState != 'loaded' && s.readyState != 'complete'){
				return;
			}
			setTimeout(function(){
				sucCb();
			}, 0);

			/**
			if(!s || ve.ua.ie && ve.ua.ie < 10 && ((typeof docMode == 'undefined' || docMode < 10) ? (s.readyState != 'loaded') : (s.readyState != 'complete'))){
				return;
			}
			sucCb();
			**/
		});
		s.src = option.src;
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(s);
	};

	/**
	 * 加载脚本
	 * @param  {Mix}   arg1     文件信息，支持格式：str || {src:str} || [str1,str2] || [{src: str1}, {src: str2}]
	 * @param  {Function} callback
	 */
	var loadScript = function(arg1, callback){
		var list = [];
		if(typeof(arg1) == 'string'){
			list.push({src:arg1});
		} else if(arg1.length){
			ve.lang.each(arg1, function(item){
				if(typeof(item) == 'string'){
					list.push({src: item});
				} else {
					list.push(item);
				}
			});
		} else {
			list.push(arg1);
		}
		batchLoadScript(list, callback);
	};


	/**
	 * 加载样式
	 * @param  {Mix}   arg1
	 * @param {Function} callback 暂不支持callback
	 */
	var loadCss = function(arg1 /**,callback**/){
		var option = {
			rel: 'stylesheet',
			rev: 'stylesheet',
			media: 'screen',
			href: null,
			win: window
		};
		if(typeof(arg1) == 'string'){
			option.href = arg1;
		} else {
			option = ve.lang.extend(true, option, arg1);
		}
		var doc = option.win.document;
		var css = doc.createElement('link');
		option.win = null;
		for(var i in option){
			if(option[i]){
				css.setAttribute(i, option[i]);
			}
		}
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(css);
	};

	ve.net.loadScript = loadScript;
	ve.net.loadCss = loadCss;
})(VEditor);