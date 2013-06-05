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
				// '../source/plugins/save/plugin.js',				//保存
				'../source/plugins/list/plugin.js',				//列表
				// '../source/plugins/tab/plugin.js',					//tab
				'../source/plugins/history/plugin.js',				//历史
				'../source/plugins/font/plugin.js',				//字体
				'../source/plugins/textjustify/plugin.js',			//排版
				'../source/plugins/qzonemedia/plugin.js',			//media base
				// '../source/plugins/htmleditor/plugin.js',			//HTML代码编辑
				'../source/plugins/toolbarswitcher/plugin.js',		//工具条切换
				// '../source/plugins/link/plugin.js',				//链接
				'../source/plugins/color/plugin.js',				//前景色
				'../source/plugins/xpaste/plugin.js',				//粘贴
				'../source/plugins/removeformat/plugin.js',		//移除格式
				//'../source/plugins/emotion/plugin.js',			//qz表情
				'../source/plugins/sosoemotion/plugin.js',			//soso表情
				'../source/plugins/imagetools/plugin.js',			//图文混排工具条
				// '../source/plugins/qzonealbum/plugin.js',			//像集
				// '../source/plugins/qzoneflash/plugin.js',			//flash
				'../source/plugins/qzoneimage/plugin.js',				//图片
				'../source/plugins/qzonemention/plugin.js',			//@
				// '../source/plugins/qzonemusic/plugin.js',			//音乐
				// '../source/plugins/qzoneqqshowbubble/plugin.js',	//泡泡
				// '../source/plugins/qzonevideo/plugin.js',			//视频
				'../source/plugins/glowfont/plugin.js',			//发光字
				// '../source/plugins/qzonevipfont/plugin.js',		//黄钻字体
				// '../source/plugins/qzonevphoto/plugin.js',			//动感影集
				// '../source/plugins/screenshot/plugin.js',			//截图
				// '../source/plugins/qzonesidealbum/plugin.js',		//侧栏插入图片
				// '../source/plugins/qzoneblogsave/plugin.js',		//发表日志
				// '../source/plugins/qzoneimageas/plugin.js'			//自动转存
			]
		}
	],
	silent: true,
	level: 0,
	encode : 'utf-8',
	comment: ' Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008'
}