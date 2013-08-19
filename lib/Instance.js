


	var Class 		= require( "ee-class" )
		, log 		= require( "ee-log" );





	module.exports = new Class( {

		  isNewRecord: true
		, updates: []


		, init: function( options ){
			this.tableName 		= options.tableName;
			this.attributes 	= options.attributes || {};
			this.isNewRecord 	= !options.attributes;
			this.db 			= options.db;
		}


		, set: function( attributes, value ){
			if ( typeof attributes === "object" ){
				Object.keys( attributes ).forEach( function( key ){
					this.attributes[ key ] = attributes[ key ];
					this.updates.push( key );
				}.bind( this ) );
			}
			else {
				this.attributes[ attributes ] = value;
				this.updates.push( key );
			}

			return this;
		}


		, get: function( attribute ){
			if ( attribute ) return this.attributes[ attribute ];
			else return this.attributes;
		}


		, request: function( target, payload, callback ){
			this.db.table( this.tableName ).request( target, payload, callback );
		}



		, typeEncoder: function( val ){
			if ( typeof val === "string" && val.length > 0 ) return { "S": val };
			else if ( typeof val === "number" ) return { "N": val + "" };
			else if ( Buffer.isBuffer( val ) ) return { B: val.toString( "base64") };
			else if ( Array.isArray( val ) && val.length > 0 ){
				if ( typeof val[ 0 ] === "string" ) return { SS: val };
				else if ( typeof val[ 0 ] === "number" ) return { NS: val + "" };
				if ( Buffer.isBuffer( val[ 0 ] ) ) return { BS: val.map( function( v ){ return v.toString( "base64" ); } ) };
			}
			return null;	
		}




		, save: function( options, callback ){
			var   cmd 			= { TableName: this.tableName }
				, attributes 	= {}
				, val, candidate;

			if ( !callback && typeof options === "function" ) callback = options, options = undefined;
			else if ( !callback ) callback = function(){};


			// transform attributes
			var keys = this.isNewRecord ? Object.keys( this.attributes ) : this.updates;
			Object.keys( this.attributes ).forEach( function( key ){
				attributes[ key ] = this.typeEncoder( this.attributes[ key ] );
			}.bind( this ) );

			// expected values
			if ( options ){
				cmd.Expected = {};

				var buildExpected = function( o ){
					Object.keys( o ).forEach( function( key ){
						cmd.Expected[ key ] = this.typeEncoder( o[ key ] === true ? this.attributes[ key ] : o[ key ] );
					}.bind( this ) );
				}.bind( this );

				if ( options.exists ) buildExpected( options.exists );
				if ( options.notExists ) buildExpected( options.notExists );

				// return values
				if ( options.capacity ) cmd.ReturnConsumedCapacity = "TOTAL";
				if ( options.metrics ) cmd.ReturnItemCollectionMetrics = "TOTAL";
				if ( options.capacity ) cmd.ReturnConsumedCapacity = "TOTAL";
				if ( options.old ) cmd.ReturnValues = "ALL_OLD";
				else if ( options.new ) cmd.ReturnValues = "ALL_NEW";
				else if ( options.oldUpdated ) cmd.ReturnValues = "UPDATED_OLD";
				else if ( options.newUpdated ) cmd.ReturnValues = "UPDATED_NEW";
			}			


			if ( this.isNewRecord ){
				// new 
				cmd.Item = attributes;

				log.dir( cmd );

				this.request( "PutItem", cmd, function( err, status, data ){
					callback( err );
				}.bind( this ) );
			}
			else {
				// update
				cmd.AttributeUpdates = attributes;


				// create keys and execute request
				var request = function( primary ){
					cmd.Key = {};
					cmd.Key[ primary.name ] = {}
					cmd.Key[ primary.name ][ ( ( primary.isArray ? primary.type : "" ) + primary.type ).toUpperCase() ] = attributes[ primary.key ];

					this.request( "UpdateItem", cmd, function( err, status, data ){
						callback( err );
					}.bind( this ) );
				}.bind( this );


				// get primay key
				if ( this.db.getTable( this.tableName ).primary ) request( this.db.getTable( this.tableName ).primary );
				else {
					this.db.describeTable( this.tableName, function( err ){
						if ( err ) callback( err );
						else request( this.db.getTable( this.tableName ).primary );
					}.bind( this ) );
				}
				
			}

			return this;
		}
	} );