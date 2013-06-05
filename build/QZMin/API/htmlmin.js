/**
 * @fileoverview rhino程序，压缩html接口
 * @author PuterJam
 * @version 1.0
 */

/**
 * min HTML Content
 * @param {String} strHtml
 */
function htmlmin(strHtml){
	var _r = strHtml;
	var _sl = strHtml.length;
	_r = _r.replace(/(\n|\r)/g,""); //del \n
	_r = _r.replace(/>([\x20\t]+)</g,"><"); //del blank & tab
	_r = _r.replace(/<!--.+?-->/g,""); // del comment
	_r = _r.replace(/^\s+|\s+$/g,""); // trim blank
	print("> Do html min. Source length: " + _sl + " --> Target length: " + _r.length);
	return _r
}