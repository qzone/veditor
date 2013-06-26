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
	log("====== START ======");

	log("[Merge Level]: \t" + (!CONF.level ? "merge" : "min"));
	for (var k in projects) {
		log("");
		var _n = projects[k].name || "unkown";
		log("[Project]: \t"+_n+"\r\n");
		process(projects[k]);
		log("======================================================");
		log("");
	};

	log("done.");
}

/**
 * 处理进程
 * @param {object} project 项目对象
 */
function process(project) {
	if(/\/$/.test(project.target)){
		for(var i=0, j=project.include.length; i<j; i++){
			var files = getFileListInDir(getFileFullPath(project.include[i]));
			copyAll(getFileFullPath(project.target), getFileFullPath(project.include[i]), files);
		}
	} else {
		var _contents = [];
		for(var i=0, j=project.include.length; i<j; i++){
			var file = getFileFullPath(project.include[i]);
			var content = IO.readFile(file);
			_contents.push(content+"\n");
			log(">> " + file + "     loaded... " + content.length + " byte.");
		}

		log("\r\nmerging target files...");
		var _bf = _contents.join("");

		//优先使用project level
		var level = project.level || CONF.level;

		if (level){
			log("min target file...");log("");
		}

		var _mfv = !level ? _bf : jsmin("/*\n" + CONF.comment + "\n*/", _bf, level);

		log("target file size: " + _mfv.length + " byte.");
		var _file = getFileFullPath(project.target);
		var _parentfile = (new File(_file)).parentFile;

		if (!_parentfile.exists()) {
			 (new File(_parentfile)).mkdirs()
		}
		IO.saveFile(_file, _mfv);
	}
}

/**
 * 拷贝文件到目标目录
 * @deprecated 该方法不处理父级目录不存在的情况，所以文件列表必须已经排列好上下文关系
 * @param  {String} targetDir 目标目录
 * @param  {String} fromDir   来源目录
 * @param  {Array} files     文件列表（全路径文件，会跟来源目录做对比，以获取相对目录）
 */
function copyAll(targetDir, fromDir, files){
	targetDir = targetDir.replace(/\\/g, '/');
	fromDir = fromDir.replace(/\\/g, '/');
	for(var i=0, j=files.length; i<j; i++){
		var file = files[i].replace(/\\/g, '/');
		var tag = targetDir+file.substring(fromDir.length);
		var source = files[i];
		var f = new File(tag);
		var ex = f.exists();
		if(!ex || true){
			if(/\/$/.test(tag)){
				f.mkdirs();														log("\r\nMD:\r\n", tag);
			} else {
				IO.copyFile(source, tag);										log("\r\nCC:");log("  SRC:"+source);log("  TAG:"+tag);
			}
		}
	}
}

function getFileFullPath(file){
	return /(:|^\/)/.test(file) ? file : ENV.configDir+file;
}

/**
 * get file list in directory
 * @param  {String} dir
 * @param  {String} nameFilter
 * @return {Array}
 */
function getFileListInDir(dir, nameFilter){
	var ret = [];
	var dir = new Packages.java.io.File(dir);
	var files = dir.list();
	for(var i=0, j=files.length; i<j; i++){
		var name = files[i];
		if(!nameFilter || name.match(nameFilter)){
			var file = getFileFullPath(dir+'/'+name);
			var f = new File(file);
			var isDir = f.isDirectory();
			ret.push(isDir ? file+'/' : file);
			if(isDir){
				ret = ret.concat(getFileListInDir(f));
			}
		}
	}
	return ret;
}