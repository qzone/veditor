/**
 * @fileoverview QZFL 文件合并工具
 * @author PuterJam
 * @version 1.4.0
 */

// ====code assist for spket====
// @include "API/io.js"
// @include "API/jsmin.js"
// @include "API/opt.js"
// @include "APP/merge.js"
// @include "APP/log.js"

importPackage(Packages.java.io);

/**
 * 引入java.lang.System对象
 */
importClass(java.lang.System);

/**
 * 引入 QZMin Java 内核接口
 */

//importClass(com.qzfl.compress.QZMin);



/**
 * @type ENV
 */
var ENV = {
	/**
	 * 用户执行所在的路径
	 * 
	 * @type String
	 */
	userDir : new String(System.getProperty("user.dir")),

	/**
	 * 操作系统分隔符
	 * 
	 * @type String
	 */
	separator : System.getProperty("file.separator") || "/",
	
	/**
	 * 配置文件的相对路径
	 * @type String
	 */
	configDir : ""
};

/**
 * 配置文件
 * 
 * @type CONF
 */
var CONF = {
	projects : {},
	level : 0,
	encode : "utf-8",
	comment : ""
};

/**
 * 执行参数
 * 
 * @type OPT
 */
var OPT = null;

/**
 * 加载系统API接口
 */
function initEnvironment(args) {
	// 加载API接口以及程序接口
	var _pwd = "";
	if (args[args.length - 1].match(/^-j=(.+)/)) {
		if (RegExp.$1.charAt(0) == ENV.separator || RegExp.$1.charAt(1) == ":") {
			_pwd = RegExp.$1;
		} else { // relative path to here
			_pwd = ENV.userDir + ENV.separator + RegExp.$1;
		}

		_pwd = new String((new Packages.java.io.File(_pwd)).getAbsolutePath()).toString().replace(/([\\\/])[\w\.]*$/, "$1");
		args.pop();
	} else {
		print("The run.js script requires you use jsrun.jar.");
		quit();
	}

	try {
		load(_pwd + "API/io.js");
		load(_pwd + "API/jsmin.js");
		load(_pwd + "API/opt.js");

		load(_pwd + "APP/merge.js");
		load(_pwd + "APP/log.js");
	} catch (e) {
		print('Base input path error, please input the path. Example: java -jar jsrun.jar QZFLMin.rhino -h');
		quit();
	}

	// 加载程序设置
	OPT = Opt.get(args, {
		c : "config",
		h : "help"
	});

	// 尝试显示帮助页面
	showHelp();

	var _conf = IO.readFile(OPT.c);
	ENV.configDir = IO.getAbsoluteDir(OPT.c)
	
	if (_conf) {
		eval("CONF = " + _conf);
		IO.setEncoding(CONF.encode);
	}else{
		print('no config file loaded. quit...');
		quit();
	}
};

/**
 * 显示帮助信息
 */
function showHelp() {
	// 显示帮助
	if (OPT.h) {
		print("Usage: ");
		print("	java -jar jsrun.jar QZFLMin.rhino [-option]");
		print("");
		print("where options include:");
		print("	-c=<value>");
		print("			config file Path");
		print("	-h");
		print("			this help file.");
		quit();
	}
}

//
//
// /**
// * 合并后的注释
// */
// var COMMENT = " Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008";
//
// /**
// * 不对target进行压缩处理
// */
// var NO_MIN = OPT.n ? true : false;
//
// /**
// * 安静模式，不在屏幕上输出过多信息
// */
// var SILENT = false;
//
// var logCache = [];
//
// var shellPrefix = OPT.s || "_!qzone_shells/guestFrontPage/";
// var qzflPrefix = OPT.l || "../qzfl_source/";
//
// /**
// * 源文件列表 projectName : project
// */
// var SOURCE_LIST = {
//
// };

/**
 * 主进程
 */
function run() {
	
	startMerge(CONF.projects);
	writeLog();
}

/*
 * 初始化运行环境
 */
initEnvironment(arguments);

/*
 * 执行主逻辑
 */ 
run();
