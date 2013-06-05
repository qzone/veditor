(function(window, document, ve, undefined) {
	ve.dom.selector = jQuery.find;
	ve.dom = jQuery(document);
	ve.dom.event = jQuery.event;
}) (window, document, VEditor);