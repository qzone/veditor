/**
 * String操作方法类
 */
(function (ve) {
	var enre = /(&|"|'|<|>)/g,
		trimre = /^\s+|\s+$/g,
		dere = /(&amp;|&lt;|&gt;|&quot;|&#39;)/g,
		enmap = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		},
		demap = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#39;': "'",
			'&apos;': "'"
		};

	ve.string = {
		htmlencode: function (str) {
			return str.replace(enre, function(_0, _1) {
				return enmap[_1] || _0;
			});
		},
		htmldecode: function (str) {
			return str.replace(dere, function(_0, _1) {
				return demap[_1] || _0;
			});
		},

		/**
		 * 获取html中文本
		 * @param string str
		 * @return string
		 **/
		getTextFromHtml: function(str){
			str = str.replace(/<\w[\s\S]*?>|<\/\w+>/g, '').replace(/\&nbsp;/ig, ' ');
			str = this.htmldecode(str);
			return str;
		},

		trim: function(str){
			if(!str){
				return str;
			}
			return str.replace(trimre, '').replace(ve.fillCharReg, '');
		}
	};
})(VEditor);