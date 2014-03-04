/**
 * 图片
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Image', {
		editor: null,
		btn: null,
		panelUrl: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('image', {
				'class': 'veInsertImage',
				title: '插入图片',
				cmd: function(){
					_this.showPanel();
				}
			});
			var domain = this.editor.getConfig('domain');
			this.panelUrl = url + 'image.html?domain='+(domain||'')+'&id='+editor.id;
		},

		showPanel: function(){
			var _this = this;
			var dlg = ve.ui.showPopup('插入图片',{src: this.panelUrl}, 500, 220);
			ve.ui.appendPopupFn(function(src, width, height, border, margin){
				if (src){
					var html = '<img src="'+src+'" alt="img" style="'+
					(border ? 'border:'+border+'px solid black;' : '')+
					(margin ? 'margin:'+margin+'px;':'')+'" '+
					(width ? 'width="'+width+'" ': '')+
					(height ? 'height="'+height+'" ': '')+'/>'
					this.editor.insertHtml({'content':html});
					_this.editor.resize();
				}
				ve.ui.closePopup();
			});
		}
	});
	ve.plugin.register('image', VEditor.plugin.Image);
})(VEditor);
