package com.qzfl.compress;
//
//import com.yahoo.platform.yui.compressor.*;
//import java.io.*;

public class QZMin {
	public static final String shrinksafe(String source, int indent, int lineno) {
		return org.dojotoolkit.shrinksafe.Compressor.compressScript(source,
				indent, lineno);
	}

//	public static final Writer jsCompress(String source, int linebreak,
//			boolean munge, boolean verbose, boolean preserveAllSemiColons,
//			boolean disableOptimizations) throws IOException {
//
//		Reader in = null;
//		Writer out = null;
//
//		JavaScriptCompressor jsCompress = null;
//
//		in = new StringReader(source);
//		jsCompress = new JavaScriptCompressor(in, null);
//		
//		in.close();
//		in = null;
//
//		out = new StringWriter();
//
//		jsCompress.compress(out, linebreak, munge, verbose,
//				preserveAllSemiColons, disableOptimizations);
//
//		return out;
//	}
//
//	public static final Writer cssCompress(String source, int arg1)
//			throws IOException {
//		Reader in = new StringReader(source);
//		Writer out = null;
//		CssCompressor cssCompress = new CssCompressor(in);
//		in.close();
//		in = null;
//		cssCompress.compress(out, arg1);
//
//		return new java.io.PrintWriter(out);
//	}
}
