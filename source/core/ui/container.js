(function(ve) {

	ve.lang.Class('VEditor.ui.Container:VEditor.ui.UIControl', {
		Container: function(id, s) {
			this.base(id, s);
			this.id = id;
			this.conf = s;
			this.uiControls = [];
			this._lookup = {};
		},

		add: function(c) {
			if(!c || !c.id || this._lookup[c.id]){
				//console.log('UI CONTROL ALREADY EXISTS');
				return;
			}
			this._lookup[c.id] = c;
			this.uiControls.push(c);
			return c;
		},

		setConfig: function(config){
			this.conf = config;
		},

		getConfig: function(){
			return this.conf;
		},

		get: function(n) {
			return this._lookup[n];
		},

		renderHTML: function () {
			return '<div id="' + this.id + '" class="veCommContainer ' + (this.conf['class'] || '') + '"></div>'
		}
	});
})(VEditor);