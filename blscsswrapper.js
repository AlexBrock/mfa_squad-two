var through2    = require('through2');
var crypto 		= require('crypto');
var PluginError = require('plugin-error');

module.exports = function(opt) 
{
	'use strict';

	if ( typeof opt !== 'object')  {  opt = {}; }

	return through2.obj
	(
		function ( file, enc, callback ) 
		{
			//  check if file is there
			if ( file.isNull() ) 
			{
				return callback();
			}

			if ( file.isStream() )
			{
				return this.emit( 'error', new PluginError( 'scss-wrapper',  'Streaming not supported' ) );
			}

			var	commentMark			= "//BL_SCSS_WRAPPER:OriginalContent";
			var fileName 			= file.path.replace( file.base, '' );  //  replace front slash from windowsLand
			var	newContentString 	= file.contents.toString();
			

			//  normalize windows platform slashes
			if ( process.platform.match(/^win/) )
			{
				fileName = fileName.replace(/\\/g, '/');
			}
			
			fileName	= fileName.toLowerCase().replace( ".scss", "" );

			var	fileNameHash	= crypto.createHash('md5').update( fileName ).digest( 'hex' );
			var	strPrefix		= "@if global-variable-exists( importDefine_";
			var	hasPrefix		= false;
			
			if ( newContentString.trim().startsWith( strPrefix ) )
			{	
				hasPrefix	= true;
				
				if ( opt.rewrap || opt.unwrap )
				{
					newContentString	= newContentString.slice( newContentString.indexOf( commentMark ) + commentMark.length ).trim();
				}
				else
				{
					// Prefix is already there. Skip this file.
					return callback();
				}
			}
			
			if ( opt.unwrap && !hasPrefix )
			{
				// No Prefix. Skip this file.
				this.push( file );
				return callback();
			}

			if ( !opt.unwrap )
			{	//  wrap the contents
				newContentString = strPrefix + fileNameHash + ")\r\n{ @error \"Duplicated Import " + fileName + "\" }\r\n$importDefine_" + fileNameHash + ": 1;" + commentMark + "\r\n" + newContentString + "\r\n";
			}

			//  change the file contents
			file.contents = new Buffer( newContentString );
			if ( opt.unwrap )
				console.log( "Unwrapping " + file.path );
			else	
				console.log( "Wrapping " + file.path );

			//  push the file into the output
			callback( null, file );
		}
	);
};
