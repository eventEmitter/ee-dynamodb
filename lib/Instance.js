


	var Class 		= require( "ee-class" )
		, log 		= require( "ee-log" );





	module.exports = new Class( {

		init: function( options ){
			this.$ = {};

			this.$.updates 		= [];
			this.$.tableName 	= options.tableName;
			this.$.attributes 	= options.attributes || {};
			this.$.isNewRecord 	= !options.attributes;
			this.$.entity 		= options.entity;

			this.$.attributeMap = Object.keys( this );
			if ( options.attributes ){
				Object.keys( options.attributes ).forEach( function( id ){
					if ( this.$.attributeMap.indexOf( id ) === -1 ) this[ id ] = options.attributes[ id ];
				}.bind( this ) );
			}
			this.$.beforeUpdateKeys = Object.keys( this );
		}


		, set: function( attributes, value ){
			if ( typeof attributes === "object" ){
				Object.keys( attributes ).forEach( function( key ){
					this.$.attributes[ key ] = attributes[ key ];
					this.$.updates.push( key );
					if ( this.$.attributeMap.indexOf( key ) === -1 ) this[ key ] = attributes[ key ];
				}.bind( this ) );
			}
			else {
				this.$.attributes[ attributes ] = value;
				this.$.updates.push( attributes );
				if ( this.$.attributeMap.indexOf( attributes ) === -1 ) this[ attributes ] = value;
			}

			return this;
		}


		, get: function( attribute ){
			if ( attribute ) return this.$.attributes[ attribute ];
			else return this.$.attributes;
		}


		, $request: function( target, payload, callback ){
			this.$.entity.request( target, payload, callback );
		}



		, $typeEncoder: function( val ){
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
			var   cmd 			= { TableName: this.$.tableName }
				, attributes 	= {}
				, val, candidate;

			if ( !callback && typeof options === "function" ) callback = options, options = undefined;
			else if ( !callback ) callback = function(){};

			// collect values stored directly on this object
			Object.keys( this ).forEach( function( id ){
				if ( this.$.attributeMap.indexOf( id ) === -1 ){
					this.$.attributes[ id ] = this[ id ];
					if ( this.$.beforeUpdateKeys.indexOf( id ) === -1 ) this.$.updates.push( id );					
				}
			}.bind( this ) );

			// transform attributes
			var keys = this.$.isNewRecord ? Object.keys( this.$.attributes ) : this.$.updates;
			keys.forEach( function( key ){
				attributes[ key ] = this.$typeEncoder( this.$.attributes[ key ] );
			}.bind( this ) );

			// expected values
			if ( options ){
				cmd.Expected = {};

				var buildExpected = function( o ){
					Object.keys( o ).forEach( function( key ){
						cmd.Expected[ key ] = this.$typeEncoder( o[ key ] === true ? this.$.attributes[ key ] : o[ key ] );
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


			if ( this.$.isNewRecord ){
				// new 
				cmd.Item = attributes;

				this.$request( "PutItem", cmd, function( err, status, data ){
					callback( err, this );
				}.bind( this ) );
			}
			else {
				// update
				cmd.AttributeUpdates = {};
				cmd.Key = {};

				Object.keys( attributes ).forEach( function( id ){
					cmd.AttributeUpdates[ id ] = { Value: attributes[ id ] };
				}.bind( this ) );

				Object.keys( this.$.entity.primaryKeys ).forEach( function( id ){
					cmd.Key[ id ] = this.$typeEncoder( this.$.attributes[ id ] );
				}.bind( this ) );

				this.$request( "UpdateItem", cmd, function( err, status, data ){
					callback( err, this );
				}.bind( this ) );
				
			}

			return this;
		}
	} );