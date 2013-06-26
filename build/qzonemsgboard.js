/**
 * qzone留言板编辑器
 */
{
	projects: [
		{
			name : 'qzone editor for profile.',
			target : '../release/ve.qzonemsgboard.js',
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
				'../source/plugins/list/plugin.js',					//列表
				'../source/plugins/history/plugin.js',				//历史
				'../source/plugins/font/plugin.js',					//字体
				'../source/plugins/textjustify/plugin.js',			//排版
				'../source/plugins/qzonemedia/plugin.js',			//media base
				'../source/plugins/toolbarswitcher/plugin.js',		//工具条切换
				'../source/plugins/color/plugin.js',				//前景色
				'../source/plugins/xpaste/plugin.js',				//粘贴
				'../source/plugins/removeformat/plugin.js',			//移除格式
				'../source/plugins/sosoemotion/plugin.js',			//soso表情
				'../source/plugins/imagetools/plugin.js',			//图文混排工具条
				'../source/plugins/qzoneimage/plugin.js',			//图片
				'../source/plugins/qzonemention/plugin.js',			//@
				'../source/plugins/glowfont/plugin.js'				//发光字
			]
		}
	],
	silent: false,
	level: 0,
	log: 'qzonemsgboard.log',
	encode : 'utf-8',
	comment: ' Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008'
}