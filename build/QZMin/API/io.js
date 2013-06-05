/**
 * @fileoverview rhino程序，文件IO接口
 * @author PuterJam
 * @version 1.0
 */
/**
 * File IO Class
 * 
 * @constructor
 * @classDescription File IO Class
 */
var IO = {
	/**
	 * file encoding
	 */
	encoding : "utf-8",

	/**
	 * read File Contents
	 * 
	 * @param {string} filePath Path to file to open.
	 * @param {string} content save contents to file
	 * @param {boolean} append Open in append mode?
	 */
	saveFile : function(filePath, content, append) {
		var _file = this.openFile(filePath, append);
		_file.write(content);
		_file.flush();
		_file.close();
	},

	/**
	 * read File Contents
	 * 
	 * @param {string} filePath Path to file to read.
	 */
	readFile : function(filePath) {
		return readFile(filePath, this.encoding);
	},

	/**
	 * open file to string
	 * 
	 * @param {string} filePath Path to file to open.
	 * @param {boolean} append Open in append mode?
	 * @return {PrintWriter} return Print Writer
	 */
	openFile : function(filePath, append) {
		append = append || false;
		var _file = new Packages.java.io.File(filePath);
		return new Packages.java.io.PrintWriter(new Packages.java.io.OutputStreamWriter(new Packages.java.io.FileOutputStream(_file, append), this.encoding));
	},

	getAbsoluteDir : function(filePath) {
		return new String((new Packages.java.io.File(filePath)).getAbsolutePath()).toString().replace(/([\\\/])[\w\.]*$/, "$1");
	},

	/**
	 * set Class encoding
	 * 
	 * @param {Object} encoding
	 */
	setEncoding : function(encoding) {
		this.encoding = encoding;
	}
}
