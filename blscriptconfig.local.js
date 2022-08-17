var	reactBuild = require( "./react/reactBuild.js" );

function extend( a, b )
{
    for ( var key in b )
        if ( b.hasOwnProperty(key) )
            a[key] = b[key];
    return a;
}

var config =
	{
		production:		false
	,	output_root:	"./dist/resources/static/_build"
	,	css:	{
					build:		[
									'./scss/*.scss'
								]
				,	wrap:		[
									'./scss/**/*.scss'
								]
				,	clean:		[
									'./dist/resources/static/_build/css/*.build.css',
									'./dist/resources/static/_build/css/*.build.css.map',
								]
				,	watch:		[
									'./scss/**/*.scss'
								]
				,	sourcemap:	true
				}
	,	react:	{
					build:		reactBuild
				,	clean:		[
									'./dist/resources/static/_build/js/*.build.js',
									'./dist/resources/static/_build/js/*.build.js.map',
									'./dist/resources/static/_build/js/*.licenses.txt',
								]
				,	sourcemap:	true
				,	minify:		false
				}
	,	lint:	{
					check:		[
									'./react/**/*.js',
									'./react/**/*.jsx',
								]
				}
	};

module.exports = config;
