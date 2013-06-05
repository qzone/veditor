(function(ve){
	/**
	 * 属性扩展方法
	 * @param {Mix} arg1
	 * @param {Mix} arg2
	 * @return {Mix}
	 **/
	var X = function(t/**,arg1,arg2**/) {
		var a = arguments;
		for ( var i=1; i<a.length; i++ ) {
			var x = a[i];
			for ( var k in x ) {
				if (!t.hasOwnProperty(k)) {
					t[k] = x[k];
				}
			}
		}
		return t;
	};

	/**
	 * 去除object里面的key的大小写区分
	 * @param {Object} obj
	 * @return {Object}
	 **/
	var _t = function(obj){
		var tmp = {};
		for(var key in obj){
			var item = obj[key];
			if(typeof(item) == 'object'){
				tmp[key.toUpperCase()] = transToUpperCase(item);
			} else {
				tmp[key.toUpperCase()] = item;
			}
		}
		return tmp;
	};

	/**
	 * DTD对象
	 * @deprecated 对象中以$符号开始的，表示为额外的判定方法，传入的参数不一定是tagName
	 * 例如 ve.dtd.$displayBlock[node.style.display]
	 * @return {Boolean}
	 */
	ve.dtd = (function(){
		//交叉规则
		var A = _t({isindex:1,fieldset:1}),
	        B = _t({input:1,button:1,select:1,textarea:1,label:1}),
	        C = X( _t({a:1}), B ),
	        D = X( {iframe:1}, C ),
	        E = _t({hr:1,ul:1,menu:1,div:1,blockquote:1,noscript:1,table:1,center:1,address:1,dir:1,pre:1,h5:1,dl:1,h4:1,noframes:1,h6:1,ol:1,h1:1,h3:1,h2:1}),
	        F = _t({ins:1,del:1,script:1,style:1}),
	        G = X( _t({b:1,acronym:1,bdo:1,'var':1,'#':1,abbr:1,code:1,br:1,i:1,cite:1,kbd:1,u:1,strike:1,s:1,tt:1,strong:1,q:1,samp:1,em:1,dfn:1,span:1}), F ),
	        H = X( _t({sub:1,img:1,embed:1,object:1,sup:1,basefont:1,map:1,applet:1,font:1,big:1,small:1}), G ),
	        I = X( _t({p:1}), H ),
	        J = X( _t({iframe:1}), H, B ),
	        K = _t({img:1,embed:1,noscript:1,br:1,kbd:1,center:1,button:1,basefont:1,h5:1,h4:1,samp:1,h6:1,ol:1,h1:1,h3:1,h2:1,form:1,font:1,'#':1,select:1,menu:1,ins:1,abbr:1,label:1,code:1,table:1,script:1,cite:1,input:1,iframe:1,strong:1,textarea:1,noframes:1,big:1,small:1,span:1,hr:1,sub:1,bdo:1,'var':1,div:1,object:1,sup:1,strike:1,dir:1,map:1,dl:1,applet:1,del:1,isindex:1,fieldset:1,ul:1,b:1,acronym:1,a:1,blockquote:1,i:1,u:1,s:1,tt:1,address:1,q:1,pre:1,p:1,em:1,dfn:1}),

	        L = X( _t({a:0}), J ),
	        M = _t({tr:1}),
	        N = _t({'#':1}),
	        O = X( _t({param:1}), K ),
	        P = X( _t({form:1}), A, D, E, I ),
	        Q = _t({li:1}),
	        R = _t({style:1,script:1}),
	        S = _t({base:1,link:1,meta:1,title:1}),
	        T = X( S, R ),
	        U = _t({head:1,body:1}),
	        V = _t({html:1});

	    //特殊规则
		var block = _t({address:1,blockquote:1,center:1,dir:1,div:1,section:1,header:1,footer:1,nav:1,article:1,aside:1,figure:1,dialog:1,hgroup:1,time:1,meter:1,menu:1,command:1,keygen:1,output:1,progress:1,audio:1,video:1,details:1,datagrid:1,datalist:1,dl:1,fieldset:1,form:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,hr:1,isindex:1,noframes:1,ol:1,p:1,pre:1,table:1,ul:1}),
			empty =  _t({area:1,base:1,br:1,col:1,hr:1,img:1,input:1,link:1,meta:1,param:1,embed:1,wbr:1});

		return {
			/**
			 * 判断节点display是否为块模型
			 * @param {String} DOM.style.display
			 * @return {Boolean}
			 */
			$displayBlock: {
				'-webkit-box':1,'-moz-box':1,'block':1 ,'list-item':1,'table':1 ,'table-row-group':1,
				'table-header-group':1,'table-footer-group':1,'table-row':1,'table-column-group':1,
				'table-column':1, 'table-cell':1 ,'table-caption':1
			},

			/**
			 * 判定方法
			 * @param {String} DOM.tagName
			 * @return {Boolean}
			 */
			$nonBodyContent: X( V, U, S ),
			$block : block,
			$inline : L,
			$body : X( _t({script:1,style:1}), block ),
			$cdata : _t({script:1,style:1}),
			$empty : empty,
			$nonChild : _t({iframe:1}),
			$listItem : _t({dd:1,dt:1,li:1}),
			$list: _t({ul:1,ol:1,dl:1}),
			$isNotEmpty : _t({table:1,ul:1,ol:1,dl:1,iframe:1,area:1,base:1,col:1,hr:1,img:1,embed:1,input:1,link:1,meta:1,param:1}),
			$removeEmpty : _t({a:1,abbr:1,acronym:1,address:1,b:1,bdo:1,big:1,cite:1,code:1,del:1,dfn:1,em:1,font:1,i:1,ins:1,label:1,kbd:1,q:1,s:1,samp:1,small:1,span:1,strike:1,strong:1,sub:1,sup:1,tt:1,u:1,'var':1}),
			$removeEmptyBlock : _t({'p':1,'div':1}),
			$tableContent : _t({caption:1,col:1,colgroup:1,tbody:1,td:1,tfoot:1,th:1,thead:1,tr:1,table:1}),
			$notTransContent : _t({pre:1,script:1,style:1,textarea:1}),

			/**
			 * 普通判定
			 * @param {String} DOM.tagName
			 * @return {Boolean}
			 */
			html: U,
			head: T,
			style: N,
			script: N,
			body: P,
			base: {},
			link: {},
			meta: {},
			title: N,
			col : {},
			tr : _t({td:1,th:1}),
			img : {},
			embed: {},
			colgroup : _t({thead:1,col:1,tbody:1,tr:1,tfoot:1}),
			noscript : P,
			td : P,
			br : {},
			th : P,
			center : P,
			kbd : L,
			button : X( I, E ),
			basefont : {},
			h5 : L,
			h4 : L,
			samp : L,
			h6 : L,
			ol : Q,
			h1 : L,
			h3 : L,
			option : N,
			h2 : L,
			form : X( A, D, E, I ),
			select : _t({optgroup:1,option:1}),
			font : L,
			ins : L,
			menu : Q,
			abbr : L,
			label : L,
			table : _t({thead:1,col:1,tbody:1,tr:1,colgroup:1,caption:1,tfoot:1}),
			code : L,
			tfoot : M,
			cite : L,
			li : P,
			input : {},
			iframe : P,
			strong : L,
			textarea : N,
			noframes : P,
			big : L,
			small : L,
			span :_t({'#':1,br:1}),
			hr : L,
			dt : L,
			sub : L,
			optgroup : _t({option:1}),
			param : {},
			bdo : L,
			'var' : L,
			div : P,
			object : O,
			sup : L,
			dd : P,
			strike : L,
			area : {},
			dir : Q,
			map : X( _t({area:1,form:1,p:1}), A, F, E ),
			applet : O,
			dl : _t({dt:1,dd:1}),
			del : L,
			isindex : {},
			fieldset : X( _t({legend:1}), K ),
			thead : M,
			ul : Q,
			acronym : L,
			b : L,
			a : X( _t({a:1}), J ),
			blockquote :X(_t({td:1,tr:1,tbody:1,li:1}),P),
			caption : L,
			i : L,
			u : L,
			tbody : M,
			s : L,
			address : X( D, I ),
			tt : L,
			legend : L,
			q : L,
			pre : X( G, C ),
			p : X(_t({'a':1}),L),
			em :L,
			dfn : L
		};
	})();
})(VEditor);