# ee-dynamodb


 	*** under contruction! ***
 	
fast & simple dynamodb access

## installation
	
	npm install ee-dynamodb

## usage

	
	var DynamoDB = require( "ee-dynamodb" );


	var db = new DynamoDB( {
		  key: 		""
		, secret:	""
		, region: 	"eu-west-1" 
	} );


	// create a table
	var table = new db.table( config, [ cb ] );
	var user = new db.table( {}, function( err, user ){} );


	// delete table
	db.tablename.delete( [ cb ] );
	db.user.delete( function( err ){} );


	// create a user
	var user = new db.tablename( user, [ cb ] );
	var users = new db.tablename( [ user, .. ], [ cb ] );

	var michael = new db.user( {
		  name: "michael"
		, birthdate: Date.now()
	} ).save( function( err, michael ){} );

	// create multiple users
	var users = new db.user( [ { name: "fabian" }, { name: "konrad" } ], fucntion( err, users ){} );



	// find one user
	db.tablename.findOne( filter, cb );
	db.user.findOne( { name: "michael" }, function( err, user ){} );


	// find multiple users
	db.tablename.find( filter, cb );
	db.user.find( { birthdate: { gt: 0 } }, function( err, users ){} );




	// update user
	entityObject.someField = value;
	entityObject.save( cb );

	user.someNewFieldNeverSeenBefore = Math.random();
	user.save( function( err ){} );


	// static update
	db.tablename.update( filter, update, [ cb ] );
	db.user.update( { birthdate: { lt: Date.noe() } }, { someNewFieldNeverSeenBefore: MAth.random() }, function( err ){} );

	

	// delete user
	entityObject.delete( [ cb ] );
	user.delete( function( err ){} );


	// static delete
	db.tablename.remove( filter, [ cb ] );
	db.user.remove( { name: [ "michael", "fabian" ] }, function(){} )