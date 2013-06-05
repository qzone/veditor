/**
 编辑器build程序
 @author sasumi
 然后根据这个版本在当前目录产生调用脚本
 当前配置文件默认压缩级别为0
**/
{
	projects: [
		{
			name : 'qzone editor for profile.',
			target : '../release/ve.standalone.js',
			level : 0,
			include : [
			//定义
			'../source/core/core.js',

			'../source/core/helper/lang.js',
			'../source/core/helper/dom.js',
			'../source/core/helper/selector.js',

			'../source/core/helper/ua.js',
			'../source/core/helper/event.js',
			'../source/core/helper/net.js',
			'../source/core/helper/string.js',

			//编辑器核心
			'../source/core/editor.js',
			'../source/core/editorcommands.js',
			'../source/core/range.js',
			'../source/core/plugin.js',
			'../source/core/dtd.js',
			'../source/core/view.js',

			//ui类库
			'../source/core/ui/uicontrol.js',
			'../source/core/ui/base.js',
			'../source/core/ui/container.js',
			'../source/core/ui/toolbar.js',
			'../source/core/ui/button.js',
			'../source/core/ui/listbox.js',
			'../source/core/ui/masklayer.js',
			'../source/core/ui/popup.js',
			'../source/core/ui/simplepopup.js',
			]
		}
	],
	level: 0,
	silent: true,
	encode : 'utf-8',
	comment: ' Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008'
}