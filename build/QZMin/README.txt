======================================================================

����:

QZMinһ��ǰ�˽ű��ϲ�����ѹ���Ĺ��ߣ�����ʹ��������߿��ԶԶ���ű�
�ļ����кϲ�����ѹ��������

======================================================================

ʹ�û���:

Java ����� 1.5 ���ϰ汾
����ϵͳ: Windows, Mac, Linux

======================================================================

ʹ�÷���:

ʹ��ǰ��ȷ�����Ļ����Ѿ���װ��java�������������Ϣ�뵽�������
http://www.java.com/getjava/

ʹ�ò���ϵͳ�������й�����ִ��QZMin
> java -jar jsrun.jar run.js -c=conf\sample.conf

��Mac��Linux��
$ java -jar jsrun.jar run.js -c=conf/sample.conf

���õĲ���
  -c=<value> QZMinִ�е������ļ�

��Ҫ��ø�����Ϣ����ʹ������ѯ
$ java -jar jsrun.jar run.js -h

======================================================================

�����ļ�����:

  �� conf/ Ŀ¼����һ�������ļ�����������ʾ: 

	{
		/** source files to use, all paths is relatively
		 * @example {
		 	"projectName" : {
				target : "out/min.js",
				include :[
					"file1.js",
					"file2.js",
					"file3.js"
				]
			}
		 }
		*/
		projects: {
			"QzoneClientLib" : {
					target : "text.js",
					include : [
						"../../source/!_qzone/qzone.js"
					]
				},	
		},
			
		// compress level
		// 0: no min, merge file only
		// 1: minimal, keep linefeeds if single
		// 2: normal, the standard algorithm
		// 3: agressive, remove any linefeed and doesn't take care of potential
		level: 2,
		
		// shrink file
		shrink: false,
		
		//read & write file encoding.
		encode : "utf-8",
		
		// merge file comments.
		comment: " Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008"
	}

   �����ļ����ע������: 
	1. һ�������ļ�����ͬʱ����ϲ���Ŀ
	2. ��Ŀ���·�������Ե�ǰ�����ļ���Ŀ¼��Ϊ���·��
	3. ʹ��ǰ����ȷ��������Ŀʹ�õı���
	4. ѹ������������4���ȼ�������������Ϊ0��ѹ��

======================================================================