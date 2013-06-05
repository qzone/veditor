======================================================================

描述:

QZMin一个前端脚本合并并且压缩的工具，我们使用这个工具可以对多个脚本
文件进行合并并且压缩操作。

======================================================================

使用环境:

Java 虚拟机 1.5 以上版本
操作系统: Windows, Mac, Linux

======================================================================

使用方法:

使用前现确保您的机器已经安装了java虚拟机。更多信息请到这里查阅
http://www.java.com/getjava/

使用操作系统的命令行工具来执行QZMin
> java -jar jsrun.jar run.js -c=conf\sample.conf

在Mac或Linux上
$ java -jar jsrun.jar run.js -c=conf/sample.conf

有用的参数
  -c=<value> QZMin执行的配置文件

需要获得更多信息可以使用来查询
$ java -jar jsrun.jar run.js -h

======================================================================

配置文件范例:

  在 conf/ 目录下有一个配置文件范例如下所示: 

	{
		/** source files to use, all paths is relatively
		 * @example {
		 	"projectName" : {
				target : "out/min.js",
				include :[
					"file1.js",
					"file2.js",
					"file3.js"
				]
			}
		 }
		*/
		projects: {
			"QzoneClientLib" : {
					target : "text.js",
					include : [
						"../../source/!_qzone/qzone.js"
					]
				},	
		},
			
		// compress level
		// 0: no min, merge file only
		// 1: minimal, keep linefeeds if single
		// 2: normal, the standard algorithm
		// 3: agressive, remove any linefeed and doesn't take care of potential
		level: 2,
		
		// shrink file
		shrink: false,
		
		//read & write file encoding.
		encode : "utf-8",
		
		// merge file comments.
		comment: " Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008"
	}

   配置文件相关注意事项: 
	1. 一个配置文件可以同时多个合并项目
	2. 项目输出路径都是以当前配置文件的目录作为相对路径
	3. 使用前，请确定您的项目使用的编码
	4. 压缩比例可以有4个等级，当比例设置为0则不压缩

======================================================================