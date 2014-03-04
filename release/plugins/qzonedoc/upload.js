(function(){
	var ST_NORMAL = 0,
		ST_UPLOADING = 1,
		ST_ERROR = 2,
		ST_DONE = 3,
		MAX_UPLOAD_TIMEOUT = 60000;

	var curState = ST_NORMAL;

	var extp = {
		filename: 'file',
		outCharset:'utf-8',
		uin: QZBlog.Logic.SpaceHostInfo.getLoginUin(),
		cuin: QZFL.cookie.get("uin"),
		skey: QZFL.cookie.get("skey")
	};

	var checkFile = function(){
		var fileName = $('file').value;
		if(!fileName){
			QZBlog.Util.showMsgbox('请选择文件', 2, QZBlog.Util.MSG_LIFTTIME.MIDDLE);
			return false;
		}
		var ext = fileName.split('.').pop();
		if(!/^(doc|docx)$/i.test(ext)){
			QZBlog.Util.showMsgbox('请选择doc或docx文件', 2, QZBlog.Util.MSG_LIFTTIME.MIDDLE);
			return false;
		}
		return true;
	};

	var showState = function(state, msg){
		curState = state;
		$('select_file_panel').style.display = (state == ST_NORMAL || state == ST_ERROR) ? '' : 'none';
		$('error').style.display = state == ST_ERROR ? '' : 'none';
		$('uploading_panel').style.display = state == ST_UPLOADING ? '' : 'none';
		$('upload_done').style.display = state == ST_DONE ? '' : 'none';
		msg && ($('msg').innerHTML = msg);
		if(state == ST_ERROR){
			QZBlog.Util.Statistic.sendPV('wordUploadErr','blog.qzone.qq.com');
		}
	};

	var stat = function(code, tm){
		ReturnCodeReport.report({
			domain: 'n.qzone.qq.com',
			cgi: 'blog_upload_file',
			code: code,
			time: tm
		});
	};

	var fp = new FormPoster($('form'), {timeout:MAX_UPLOAD_TIMEOUT});
	for(var i in extp){
		fp.setParam(i, extp[i]);
	}

	var _st = (new Date()).getTime();
	fp.onStart = function(){};
	fp.onError = function(msg){
		showState(ST_ERROR, '系统正忙，请稍候重试');
		stat(503, (new Date()).getTime() - _st);
	};
	fp.onTimeout = function(){
		showState(ST_ERROR, '您的网络比较慢，请稍候重试');
		stat(999, (new Date()).getTime() - _st);
	};
	fp.onResponse = function(data){
		stat((data ? data.code : 502), (new Date()).getTime() - _st);
		if(data && data.code == 0){
			PAGE_CACHE.add('BlogDocHtml', QZFL.string.restXHTML(data.data), 10000000);
			QZONE.FP.getCurrentAppWindow().PageScheduler.extraParam["source"] = '20120301';
			showState(ST_DONE);
			QZBlog.Util.Statistic.sendPV('wordUploadSuc','blog.qzone.qq.com');
			setTimeout(function(){
				QZBlog.Util.closePopup();
			},50);
		} else {
			var msg = data && data.message ? data.message : '文档转换失败';
			showState(ST_ERROR, msg);
		}
	};

	QZFL.event.addEvent($('form'), 'submit', function(e){
		if(curState == ST_UPLOADING){
			QZBlog.Util.showMsgbox('文件正在上传，请稍候', 2, QZBlog.Util.MSG_LIFTTIME.MIDDLE);
			QZFL.event.preventDefault();
			return false;
		}
		if(!checkFile()){
			QZFL.event.preventDefault();
			return false;
		}
		$('uploading_panel').style.display = '';
		$('select_file_panel').style.display = 'none';
		showState(ST_UPLOADING);
		QZBlog.Util.Statistic.sendPV('startWordUpload','blog.qzone.qq.com');
	});

	QZFL.event.addEvent($('close-btn'), 'click', function(){
		QZFL.event.preventDefault();
		if(curState == ST_UPLOADING && !confirm('文件正在上传，是否确定取消？')){
			//
		} else {
			QZBlog.Util.closePopup();
		}
	});
})();