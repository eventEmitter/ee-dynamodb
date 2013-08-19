# ee-dynamodb


 	*** under contruction! ***
 	
fast & simple dynamodb access

 «$», «$events» or «parent»!

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
	db.create( config, [ cb ] );
	db.create( {}, function( err, user ){} );


	// delete table
	db.delete( [ cb ] );
	db.delete( function( err ){} );


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
	db.user.remove( { name: [ "michael", "fabian" ] }, function(){} );



you may not be able to create or use tables with the following names:
- init
- createTable
- deleteTable
- $
- $events
- __request