/**
 * 资源拷贝
 * source -> release
 */
{
	projects: [
		{
			name: 'source file copy',
			target: '../release/',
			level: 0,
			include: ['../source/']
		}
	],
	level: 0,
	silent: false,
	log: 'source.log',
	encode : 'utf-8',
	comment: ' Qzone Project By Qzone Web Group. \n Copyright 1998 - 2008'
}