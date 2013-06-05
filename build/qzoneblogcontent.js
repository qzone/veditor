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
			target : '../release/ve.qzoneblogcontent.js',
			level : 0,
			include : [
				//定义
				'../source/core/core.js',

				//辅助类库
				//辅助类库独立防止，主要是可以用于接入适配器
				//例如这里有适配器的话，仅需要调用适配器脚本
				'../source/core/helper/lang.js',

				'../source/adapter/qzfl.adapter.js',

				//下面的3个文件跟QZFL.adapter.js是互斥的
				// '../source/core/helper/dom.js',
				// '../source/core/helper/selector.js',
				//'../source/core/helper/ua.js',

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
				'../source/core/ui/simplepopup.js',

				//视图
				'../source/view/def/view.js',						//视图

				//插件
				'../source/plugins/linetag/plugin.js',				//换行
				'../source/plugins/history/plugin.js',				//历史
				'../source/plugins/xpaste/plugin.js',				//粘贴
				'../source/plugins/qzonemention/plugin.js',			//@
			]
		}
	],
	silent: true,
	level: 0,
	encode : 'utf-8',
	comment: ' Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008'
}