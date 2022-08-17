'use strict';

var gulp 			= require('gulp');
var sass 			= require('gulp-sass')(require('sass'));
var sourcemaps 		= require('gulp-sourcemaps');
var	using			= require('gulp-using');
var clean 			= require('gulp-clean');
var webpack 		= require('webpack-stream');
var webpackEngine 	= require('webpack');
var rename 			= require("gulp-rename");
var	gulpif			= require("gulp-if")
var minify 			= require('gulp-minify');
var	eslint			= require('gulp-eslint');
var postcss 		= require('gulp-postcss');
var autoprefixer	= require('autoprefixer');
var TerserPlugin 	= require('terser-webpack-plugin');

var path    		= require('path');
var del 			= require('del');
var CaseSensitivePathsPlugin	= require('case-sensitive-paths-webpack-plugin');
var fs				= require('fs');

var	wrapper			= require('./blscsswrapper.js');

var	CONFIG			= null;
var CURDIR			= path.resolve(__dirname, ".");
var	browserlistcfg	= [ "> 1%","last 3 versions","Safari >= 7","Firefox ESR","not ie <= 11", "ios >= 9", ]
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;

var nodeVersion = parseInt( process.versions.node.split('.')[0] );

if ( nodeVersion < 14 )
{
	console.log( "Node version low. Node Version should be 14 or higher!" );
	process.exit(1);
}

try
{
	CONFIG	= require( './blscriptconfig.local.js' );
	console.log( 'Use local script config!' );
}
catch ( err )
{
}

if ( CONFIG == null )
{
	try
	{
		CONFIG	= require( './blscriptconfig.default.js' );
		console.log( 'Use default script config!' );
	}
	catch ( err )
	{
		console.log( err );
	}
}

if ( CONFIG == null )
{
	console.log( 'No configuration found' );
	process.exit(1);
}

if ( CONFIG.production === true )
{
	process.env.NODE_ENV = 'production';
}

var webpack_config =
{
	mode:		CONFIG.production === true ? "production" : "development"
,	context: 	path.resolve(__dirname, ".")
,	watch:		false
,	watchOptions: { ignored: /node_modules/ }
,	devtool: 	( CONFIG.production === true ? 'source-map' : ( CONFIG.react.sourcemap == true ?  'eval-source-map' : 'eval' ) )
,	externals:	{ "jQuery": "jquery", "$": "jquery" }
,	output: 	{ filename: '[name].build.js' }
,	stats:		{ warnings: false }
,	module: 	{
					rules : 	
						[
							{
								test: 		/\.js(x)?$/
							,	exclude:	/(node_modules\/(?!webcrypto)|bower_components)/
							, 	use: 		{
												loader:		'babel-loader'
											,	options:	{ 
																presets: 
																	[ 
																		[
																			'@babel/preset-env'
																		,	{ 'targets': { 'browsers': browserlistcfg } }
																		]
																	,	'@babel/preset-react'  
																	]
															,	plugins: 
																	[ 
																		'@babel/plugin-proposal-object-rest-spread'
																	,	'@babel/plugin-proposal-class-properties' 
																	]
															,	cacheDirectory:
																	false
															}
											}
							}
						,	{ 
								test: 		/\.css$/
							,	use:		[ 'style-loader', 'css-loader' ]
							}
						]
				}
,	plugins: 	[ 
					new CaseSensitivePathsPlugin()
				,	new LicenseWebpackPlugin( { perChunkOutput: false } ) 
				]
,	profile:	true	
,	resolve: 	{
    				modules: ['node_modules', 'src']
    			,	extensions: ['.js', '.jsx']
  				}
 ,	optimization:	{
 						minimize:	true
 					,	minimizer:	[
									 	new TerserPlugin(
											{
												cache:			true
											,	parallel:		true
											,	sourceMap:		CONFIG.production === true || CONFIG.react.sourcemap ? true : false
											}
										)
 									]
					,	splitChunks: 
							{
								chunks:				'async'
							,	minSize:			0
							,	maxSize: 			0
							,	minChunks: 			1
							,	maxAsyncRequests:	5
							,	maxInitialRequests:	3
							,	automaticNameDelimiter:		'_'
							,	name: 						true
							,	cacheGroups: 
									{
										common:		
											{
												test: 		( module, chunks ) => 
															{ 
																if ( chunks 
																	&& chunks.length > 0 
																	&& chunks[ 0 ].name == "GlobalCommon" )
																{
																	const req = String( module.userRequest );
																	if ( req.endsWith( "GlobalCommon.jsx" ) )
																		return false;
																	return true;
																}

																return false;
															}
											,	name:		'bl_react_common'
											,	chunks:		'initial'
											,	priority:	100
											}
									}
							}
					,	runtimeChunk: 	'single'
					,	nodeEnv:		CONFIG.production === true ? "production" : false
					}
};


function getRelativeDir( file )
{
	return file.base;
}

function getCssOutputName( path )
{
	path.dirname	+= "/" + CONFIG.output_root + '/css/';
	if ( path.extname == '.css' )
		path.basename 	+= '.build';
	if ( path.extname == '.map' )
		path.basename	= path.basename.replace( '.css', '.build.css' );
}

function getReactOutputName( path )
{
	path.dirname	+= "/" + CONFIG.output_root + '/js/';
}

function buildReact( doWatch )
{
	webpack_config.watch	= doWatch;
	webpack_config.entry	= CONFIG.react.build;
	if ( doWatch )
		webpack_config.optimization.minimize	= false;

	return gulp.src( "." )
			.pipe( webpack( webpack_config, webpackEngine ) )
			.pipe( rename( getReactOutputName ) )
			.pipe( gulp.dest( '.' ) )
			.pipe( gulpif( ( CONFIG.react.minify == true ), minify( { noSource: true, ext: { src: '.build.js', min: '.min.js' } } ) ) )
			.pipe( gulpif( ( CONFIG.react.minify == true ), gulp.dest( '.' ) ) );
}

function task_css()
{
	console.log( 'Building CSSs' );
	return gulp.src( CONFIG.css.build )
				.pipe( using() )
				.pipe( gulpif( ( CONFIG.css.sourcemap == true ), sourcemaps.init() ) )
				.pipe( sass( { outputStyle: 'compressed' } ).on( 'error', sass.logError ) )
				.pipe( postcss( [ autoprefixer( { grid: true } ) ] ) )
				.pipe( rename( getCssOutputName ) )
				.pipe( gulpif( ( CONFIG.css.sourcemap == true ), sourcemaps.write( ".", { includeContent: false, sourceRoot: '../scss/' } ) ) )
				.pipe( gulp.dest( '.' ) )
				.pipe( using() );
}

function task_css_showinfo( cb )
{
	var info = autoprefixer( { grid: true } ).info();
	console.log(info);
	cb();
}

function task_css_clean()
{
	console.log( 'Clean all CSSs' );
	return del( CONFIG.css.clean, { force: true } );	
}

function task_css_watch()
{
	console.log( 'Building CSSs with Watch' );
	return gulp.watch( CONFIG.css.watch, gulp.series( task_css ) );
}

function task_css_wrap()
{
	console.log( 'Wrapping SCSSs' );
		
	return gulp.src( CONFIG.css.wrap )
			.pipe( wrapper() )
			.pipe( gulp.dest( getRelativeDir ) );
}

function task_css_unwrap()
{
	console.log( 'Unwrapping SCSSs' );
		
	return gulp.src( CONFIG.css.wrap )
			.pipe( wrapper( { unwrap: true } ) )
			.pipe( gulp.dest( getRelativeDir ) );
}

function task_react()
{
	console.log( 'Building JSXs : ' + process.env.NODE_ENV );
	return buildReact( false );	
}

function task_react_clean()
{
	console.log( 'Clean all JSXs' );
	return del( CONFIG.react.clean, {force: true} );	
}

function task_react_watch()
{
	console.log( 'Building JSXs with Watch ' + process.env.NODE_ENV );
	return buildReact( true );	
}

function task_lint()
{
	return gulp.src( CONFIG.lint.check )
			.pipe( eslint() )
			.pipe( eslint.format() )
			.pipe( eslint.failAfterError() );	
}

exports[ "css" ] = task_css;
exports[ "css:showinfo" ] = task_css_showinfo;
exports[ "css:clean" ] = task_css_clean;
exports[ "css:watch" ] = task_css_watch;
exports[ "css:wrap" ] = task_css_wrap;
exports[ "css:unwrap" ] = task_css_unwrap;

exports[ "react" ] = task_react;
exports[ "react:clean" ] = task_react_clean;
exports[ "react:watch" ] = task_react_watch;

exports[ "lint" ] = task_lint;

exports[ "default" ] = gulp.parallel( task_css, task_react );
exports[ "clean" ] = gulp.parallel( task_css_clean, task_react_clean );
exports[ "watch" ] = gulp.series( gulp.parallel( task_css_clean, task_react_clean ), task_css, gulp.parallel( task_css_watch, task_react_watch ) );
