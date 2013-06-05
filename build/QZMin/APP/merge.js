/**
 * @fileOverview QZFLMin 压缩逻辑
 */

// @include "../QZFLMin.rhino"
/**
 * 开始合并文件
 * 
 * @param {Object} sList
 */
function startMerge(projects) {
	log("processing ...");

	log("[Merge Type]:" + (!CONF.level ? "merge" : "min"));
	for (var k in projects) {
		var _n = projects[k].name || "unkown";
		log("[" + _n + "] project in process  -----------------------------------------");
		process(projects[k]);
		log("[" + _n + "] builded success ------------------------------------");
		log("");
		log("");
	};

	log("done.");
}

/**
 * 处理进程
 * 
 * @param {object} project 项目对象
 */
function process(/* object */project) {
	var _files = project.include;
	var _fileCache = [];
	for (var k in _files) {
		var _isAPath = /(:|^\/)/.test(_files[k]);
		var _fileName = (!_isAPath?ENV.configDir:"") + _files[k];
		var _fv = IO.readFile(_fileName);
		log(">> " + _files[k] + "     loaded... " + _fv.length + " byte.");
		_fileCache.push(_fv + "\n");
	}

	log("");
	log("merge target files...");
	var _bf = _fileCache.join("");
	// if (project.debugTarget && !OPT.r) {
	// log("Write file for debug... done. File length: " + _bf.length + "
	// byte.");
	// IO.saveFile(ENV.userDir + project.debugTarget, _bf);
	// };

	if (project.target) {
		log("");
		
		//优先使用project level
		var level = project.level || CONF.level;

		if (false && CONF.shrink) {
			//log("shrink target file...");log("");
			//_bf = new String(QZMin.shrinksafe(_bf,0,1));
		}else if (level){
			log("min target file...");log("");
		}
		
		var _mfv = !level ? _bf : jsmin("/*\n" + CONF.comment + "\n*/", _bf, level);

		log("Write file for release... done.  File length: " + _mfv.length + " byte.");
		var _isAPath = /(:|^\/)/.test(project.target);
		var	_path = (!_isAPath?ENV.configDir:"");
		var _file = _path + project.target;
		var _parentfile = (new File(_file)).parentFile;

		if (!_parentfile.exists()) {
			 (new File(_parentfile)).mkdirs()
		}
		//_mfv = QZMin.shrinksafe(_mfv,0,1);
	
		IO.saveFile(_file, _mfv);
	};
	log("");
}
