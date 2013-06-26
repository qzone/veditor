/**
 * @fileOverview log记录文件
 */

var logCache = [];

/**
 * 记录log
 *
 * @param {String} str log信息
 */
function log() {
	var str = '';
	for(var i=0; i<arguments.length; i++){
		str += arguments[i]+' ';
	}
	logCache.push(str + "\r\n");
	if (!CONF.silent) {
		print(str);
	}
}

/**
 * 把最近一次log写入文件
 */
function writeLog(fileName) {
	fileName = fileName || 'build.log';
	if (CONF.silent) {
		return
	}
	var _log = logCache.join("");
	IO.saveFile(ENV.userDir + "/"+fileName, _log);
}
