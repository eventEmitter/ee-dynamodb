


	var   Class		= require( "ee-class" )
		, Requester = require( "ee-aws-v4-request" ) 
		, log 		= require( "ee-log" );



	module.exports = new Class( {


		init: function( options ){
			this.service = options.service;
			this.version = options.version;

			this.requester = new Requester( options );
		}


		, request: function( target, payload, callback ){
			this.requester.request( {
				  method: "post"
				, payload: JSON.stringify( payload )
				, headers: {
					"X-Amz-Target": this.service + "_" + this.version + "." + target
				}
			}, callback );
		}
	} );
