/**
 * @fileOverview log记录文件
 */
 
var logCache = [];
 
/**
 * 记录log
 * 
 * @param {String} str log信息
 */
function log(str) {
	logCache.push(str + "\r\n");
	if (!CONF.silent) {
		print(str);
	}
}

/**
 * 把最近一次log写入文件
 */
function writeLog() {
	if (CONF.silent) {
		return
	}
	var _log = logCache.join("");
	IO.saveFile(ENV.userDir + "/build.log", _log);
}
