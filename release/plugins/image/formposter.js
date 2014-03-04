/**
 * 表单提交组件
 * 使用方法：
 * var fp = new FormPoster($('form'));
 */
var FormPoster = (function(){
	var _guid_count = 1;
	var _guid = function(){
		return '_form_poster_'+(_guid_count++);
	};
	var _extend = function(tag, src){
		src = src || {};
		var ret = tag;
		for(var i in src){
			ret[i] = src[i];
		}
		return ret;
	};
	var each = function(obj, fn){
		for(var i in obj){
			fn(obj[i]);
		}
	};
	var addEvent = function(obj, event, fn){
		if(obj.addEventListener){
			obj.addEventListener(event, fn, false);
		} else {
			obj.attachEvent('on'+event, fn);
		}
	};

	/**
	 * 表单提交组件
	 * @param  {DOM} form   表单DOM
	 * @param  {Object} option 选项
	 */
	var _FP = function(form, option){
		var _this = this;
		this._called = false;
		this.option = _extend({
			callbackMethod: 'callback',			//回调方法名称
			timeout: 30000						//超时时间（毫秒）
		}, option);

		var sid = form.getAttribute('data-fp-id');
		if(!sid){
			sid = 'data-fp-'+_guid();
			form.setAttribute('data-fp-id', sid);
			form.target = sid;
		}
		var iframe = document.getElementById(sid);
		if(!iframe){
			var div = document.createElement('div');
			div.style.cssText = 'display:none';
			div.innerHTML = '<iframe id="'+sid+'" name="'+sid+'" frameborder="0"></iframe>';
			iframe = div.firstChild;
			iframe[this.option.callbackMethod] = function(){
				_this._called = true;
				if(!_this.option.timeout || _this._timer){
					_this.onResponse.apply(_this, arguments);
				}
			};
			iframe.onload = function(){
				if(!_this.option.timeout || _this._timer){
					setTimeout(function(){
						if(!_this._called){
							_this.onError('response error');
						}
						_this.resetState();
						_this.onComplete();
					}, 0);
				}
			};
			document.body.appendChild(div);

			addEvent(form, 'submit', function(){
				if(_this.option.timeout){
					_this._timer = setTimeout(function(){
						_this.onTimeout();
						_this.resetState();
					}, _this.option.timeout);
				}
			});
		}
		this.form = form;
		this.iframe = iframe;
		this._timer = null;
	};

	/**
	 * 添加提交参数
	 * @param  {String} name  变量名
	 * @param  {String} value 变量值
	 */
	_FP.prototype.addParam = function(name, value) {
		var input = document.createElement('input');
		input.type = 'hidden';
		input.name = name;
		input.value = value;
		this.form.appendChild(input);
	};

	/**
	 * 设置提交参数
	 * @description 这个方法会检测重复，如果已经有相应的名称，则覆盖
	 * @param  {String} name  变量名
	 * @param  {String} value 变量值
	 * @return {Boolean}      是否覆盖
	 */
	_FP.prototype.setParam = function(name, value) {
		var found = false;
		each(this.form.elements, function(el){
			if(el && el[name] == name){
				el.value = value;
				found = true;
			}
		});
		if(!found){
			this.addParam(name, value);
		}
		return found;
	};

	/**
	 * 删除参数
	 * @param  {String} name 变量名
	 * @return {Boolean}     是否命中
	 */
	_FP.prototype.delParam = function(name) {
		var found = false;
		each(this.form.elements, function(el){
			if(el && el.name == name){
				el.parentNode.removeChild(el);
				found = true;
			}
		});
		return found;
	};

	_FP.prototype.onResponse = function(data){};
	_FP.prototype.onComplete = function() {};
	_FP.prototype.onError = function(msg, code, responseData){};
	_FP.prototype.onTimeout = function(){_this.onError('timeout');};
	_FP.prototype.resetState = function(){
		clearTimeout(this._timer);
		this._timer = 0;
		this._called = false;
	};
	return _FP;
})();