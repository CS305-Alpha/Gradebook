/*
Zach Boylan, Zaid Bhujwala, Andrew Figueroa, Steven Rollo

Data Science & Systems Lab (DASSL), Western Connecticut State University

Copyright (c) 2017- DASSL. ALL RIGHTS RESERVED.
Licensed to others under CC 4.0 BY-NC-SA
https://creativecommons.org/licenses/by-nc-sa/4.0/

ALL ARTIFACTS PROVIDED AS IS. NO WARRANTIES EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

Gradebook node.js web server
This program serves a Gradebook home page that allows an instructor to
view attendance based on a year, season, course, and section provided
Currently, database connection parameters must also be provided - these must
point to a database with Gradebook installed.  Additionally, the server expects
all Gradebook objects to exist in a schema called "gradebook".

A static page is served at '/', along with some js and css dependencies
Additionally, five REST calls are implemented that this pages uses to
get data from the Gradebook db
*/
//Super secret password - Used for a temporary password encryption scheme
const superSecret = 'dassl2017';

//List of month names used when generating the attendance table
const monthNames = [
   'Jan.',
   'Feb.',
   'Mar.',
   'Apr.',
   'May',
   'Jun.',
   'Jul.',
   'Aug.',
   'Sep.',
   'Oct.',
   'Nov.',
   'Dec.'
];

var pg = require('pg'); //Postgres client module               | https://github.com/brianc/node-postgres
var sjcl = require('sjcl'); //Encryption module                | https://github.com/bitwiseshiftleft/sjcl
var express = require('express'); //Express module             | https://github.com/expressjs/express
var fs = require('fs'); //File System module                   | https://nodejs.org/api/fs.html
var copyFrom = require('pg-copy-streams').from; //Copy Module  | https://github.com/brianc/node-pg-copy-streams

var app = express();

/*
This function creates and returns a config object for the pg module based on some
supplied parameters.
*/
function createConnectionParams(user, database, password, host, port) {
   var config = {
      user: user.trim(),
      database: database.trim(),
      password: password.trim(),
      host: host.trim(),
      port: port.trim()
   };
   return config;
}

/*
This function creates a new connection to a Postgres instance using the
supplied connection params (var config), and executes queryText with queryParams.
Then, it calls queryCallback with the response recieved from the database.
This should help cut down on repeated code between the url handlers.
*/
function executeQuery(response, config, queryText, queryParams, queryCallback) {
   var client = new pg.Client(config); //Connect to pg instance
   client.connect(function(err) {
      if(err) { //If a connection error happens, 500
         response.status(500).send('500 - Database connection error');
         console.log(err);
      }
      else { //Try and execute the query
         client.query(queryText, queryParams, function(err, result) {
            if(err) { //If the query returns an error, 500
               response.status(500).send('500 - Query execution error');
               console.log(err);
            }
            else { //Execute the query callback
               queryCallback(result);
               client.end(); //Close the connection
            }
         });
      }
   });
}

//Tell the browser we don't have a favicon
app.get('/favicon.ico', function(request, response) {
   response.status(204).send(); //No content
});

//Serve our homepage when a user goes to the root
app.get('/', function(request, response) {
   response.sendFile('client/index.html', {root: __dirname});
});

//Serve our homepage when a user goes to the root
app.get('/index.html', function(request, response) {
   response.sendFile('client/index.html', {root: __dirname});
});

//Serve css and js dependencies
app.get('/css/materialize.min.css', function(request, response) {
   response.sendFile('client/css/materialize.min.css', {root: __dirname});
});

app.get('/js/materialize.min.js', function(request, response) {
   response.sendFile('client/js/materialize.min.js', {root: __dirname});
});

app.get('/js/index.js', function(request, response) {
   response.sendFile('client/js/index.js', {root: __dirname});
});

//Returns instructor id and name from a provided email.
app.get('/login', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   //Get the params from the url
   var instructorEmail = request.query.instructoremail.trim();

   //Set the query text
   var queryText = 'SELECT ID, FName, MName, LName, Department FROM getInstructor($1);';
   var queryParams = [instructorEmail];

   //Execute the query
   executeQuery(response, config, queryText, queryParams, function(result) {
      //Check if any rows are returned.  No rows implies that the provided
      //email does not match an existing instructor
      if(result.rows.length == 0) {
         response.status(401).send('401 - Login failed');
      }
      else {
         var jsonReturn = {
            "instructor": result.rows[0] //getInstructors should return at most one row
         };
         response.send(JSON.stringify(jsonReturn));
      }
   });
});

//Return a list of years a certain user has taught sections
app.get('/years', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   //Get the params from the url
   var userID = request.query.userID;
   var userRole = request.query.userRole; //assuming this is provided at the UI level
   var queryText;

   //Set the query text
   var queryParams;
   if (userRole == 'alpha_GB_Instructor')
   {
      queryText = 'SELECT Year FROM getInstructorYears($1);';
      queryParams = [userID];
   } 
   else if (userRole == 'alpha_GB_Student')
   {
      queryText = 'SELECT Year FROM getYearsAsStudent();';
   }
   else
   {
      queryText = 'SELECT DISTINCT year FROM term;';
   }


   //Execute the query
   executeQuery(response, config, queryText, queryParams, function(result) {
      var years = []; //Put the rows from the query into json format
      for(row in result.rows) {
         years.push(result.rows[row].year);
      }
      var jsonReturn = {
         "years": years
      } //Send the json to the client
      response.send(JSON.stringify(jsonReturn));
   });
});

//Return a list of seasons a user has attended during a certain year
app.get('/seasons', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   //Get the params from the url
   var userID = request.query.userid;
   var userRole = request.query.userRole;
   var year = request.query.year;
   var queryText;
   var queryParams;

   //Set the query
   var queryParams;

   if(userRole == 'alpha_GB_Instructor') {
      queryText = 'SELECT SeasonOrder, SeasonName FROM getInstructorSeasons($1, $2);';
      queryParams = [userID, year];
   }
   else if(userRole == 'alpha_GB_Student') {
      queryText = 'SELECT SeasonOrder, SeasonName FROM getSeasonsAsStudent();';
   }
   else {
      queryText = 'SELECT S."Order", S.Name FROM term T JOIN season S ON ' +
                  'T.season = S."Order" WHERE T.Year = $1;';
      queryParams = [year];
   }


   //Execute the query
   executeQuery(response, config, queryText, queryParams, function(result) {
      var seasons = []; //Put the rows from the query into json format
      for(row in result.rows) {
         seasons.push(
            {
               "seasonorder": result.rows[row].seasonorder,
               "seasonname": result.rows[row].seasonname
            }
         );
      }
      var jsonReturn = {
         "seasons": seasons
      } //Send the json to the client
      response.send(JSON.stringify(jsonReturn));
   });
});

//Returns a list of courses an instructor has taugh in a certain year
app.get('/courses', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   var instructorID = request.query.instructorid;
   var year = request.query.year;
   var seasonOrder = request.query.seasonorder;

   var queryText = 'SELECT Course FROM getInstructorCourses($1, $2, $3);';
   var queryParams = [instructorID, year, seasonOrder];

   executeQuery(response, config, queryText, queryParams, function(result) {
      var courses = [];
      for(row in result.rows) {
         courses.push(result.rows[row].course);
      }
      var jsonReturn = {
         "courses": courses
      };
      response.send(JSON.stringify(jsonReturn));
   });

});

//Returns a list of sesctions an instructor taught in a certain term
app.get('/sections', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   var instructorID = request.query.instructorid;
   var year = request.query.year;
   var seasonOrder = request.query.seasonorder;
   var courseNumber = request.query.coursenumber;

   var queryText = 'SELECT SectionID, SectionNumber FROM getInstructorSections($1, $2, $3, $4);';
   var queryParams = [instructorID, year, seasonOrder, courseNumber];

   executeQuery(response, config, queryText, queryParams, function(result) {
      var sections = [];
      for(row in result.rows) {
         sections.push(
            {
               "sectionid": result.rows[row].sectionid,
               "sectionnumber": result.rows[row].sectionnumber
            }
         );
      }
      var jsonReturn = {
         "sections": sections
      };
      response.send(JSON.stringify(jsonReturn));
   });
});

//Returns an array of dates for a given section id.  Omits dates when classes are
// not held.
app.get('/sectionschedule', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   var sectionID = request.query.sectionID;

   var queryText = 'SELECT date::VARCHAR FROM significantDate WHERE NOT classesheld;';
   var queryParams = [];
   var closedDates = [];

   executeQuery(response, config, queryText, queryParams, function(result) {
      for(row in result.rows) {
         closedDates.push( result.rows[row].date);
      }
   });

   queryText = 'SELECT scheduledate::VARCHAR AS date FROM getScheduleDates($1);';
   queryParams = [sectionID];

   executeQuery(response, config, queryText, queryParams, function(result) {
      var classDates = [];
      for(row in result.rows) {
         if(!closedDates.includes(result.rows[row].date))
         {
            classDates.push(result.rows[row].date);
         }
      }
      var jsonReturn = {
         "classDates": classDates
      };
      response.send(JSON.stringify(jsonReturn));
   });
});

app.get('/sectionreport', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   var year = request.query.year;
   var seasonCode = request.query.season;
   var limit = request.query.limit;
   var offset = request.query.offset;

   var queryText = "SELECT getTermCourseCount(getTermID($1, $2)) AS CourseCount, " +
                    "getTermSectionCount(getTermID($1, $2)) AS SectionCount, " +
                    "getTermInstructorCount(getTermID($1, $2)) AS InstructorCount, " +
                    "getTermStudentCount(getTermID($1, $2)) AS StudentCount;";
   var queryParams = [year, seasonCode];

   executeQuery(response, config, queryText, queryParams, function(result) {
      var courseCount = result.rows[0].coursecount;
      var sectionCount = result.rows[0].sectioncount;
      var instructorCount = result.rows[0].instructorcount;
      var studentCount = result.rows[0].studentcount;

      queryText = "SELECT * FROM getTermSectionsReport(getTermID($1, $2)) " +
                  "ORDER BY Course ASC, SectionNumber ASC LIMIT $3 OFFSET $4;";
      queryParams = [year, seasonCode, limit, offset];

      executeQuery(response, config, queryText, queryParams, function(result) {
         var jsonReturn = {
            "CourseCount": courseCount,
            "SectionCount": sectionCount,
            "InstructorCount": instructorCount,
            "StudentCount": studentCount,
            "Sections": []
         };

         for (row in result.rows) {
            jsonReturn.Sections.push(result.rows[row]);
         }

         response.send(JSON.stringify(jsonReturn));
      });
   });

});

//Return a table containing the attendance for a single section
app.get('/attendance', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   //Get attendance param
   var sectionID = request.query.sectionid;

   //Set the query text and package the parameters in an array
   var queryText = 'SELECT AttendanceCSVWithHeader FROM getAttendance($1);';
   var queryParams = [sectionID];

   //Setup the second query, to get the attendance code description table
   var queryTextAttnDesc = 'SELECT Status, Description FROM AttendanceStatus';

   //Execute the attendance description query first
   //attnStatusRes will hold the table containg the code descriptions
   executeQuery(response, config, queryTextAttnDesc, null, function(attnStatusRes) {
      //Then execute the query to get attendance data
      executeQuery(response, config, queryText, queryParams, function(result) {
         //Check if any attendance data was returned from the DB.  One header row is
         //always returned, so if the result contains only one row, then
         //no attendance data was returned
         if(result.rows.length == 1) {
            response.status(500).send('500 - No Attenance Records');
            return;
         }

         var table = '<table>';
         //Extract months from the top row of dates
         //First, split csv of dates
         var dateRow = result.rows[0].attendancecsvwithheader.split(',');
         var rowLen = dateRow.length;

         var maxMonth = 0; //Stores the lastest month found
         var months = ''; //Stores a csv of months
         var days = [dateRow[0], dateRow[1], dateRow[2]]; //Stores a csv of days

         var monthSpanWidths = []; //Stores the span associated with each month
         var currentSpanWidth = 1; //Width of the current span

         for(i = 3; i < rowLen; i++) { //For each date in the date row
            splitDate = dateRow[i].split('-');
            if(splitDate[0] > maxMonth) { //If the month part is a new month
               maxMonth = splitDate[0];
               months += ',' + monthNames[splitDate[0] - 1]; //Add it to the csv
               if(currentSpanWidth > 0) { //Set the span width of the current month cell
                  //Also include the col. number with the span width
                  monthSpanWidths.push({'col': i, 'width': currentSpanWidth});
                  currentSpanWidth = 1;
               }
            }
            else { //If it's not a new month
               currentSpanWidth++;
            }
            days += ',' + splitDate[1]; //Add day to the day row
         }
         if(currentSpanWidth > 0) { //Add the last month span
            monthSpanWidths.push({'col': i, 'width': currentSpanWidth});
         }
         //Add the month and day rows to the csv rows
         var resultSplitDates = result.rows.slice(1);
         resultSplitDates.unshift({attendancecsvwithheader: days});
         resultSplitDates.unshift({attendancecsvwithheader: months});

         //Execute for each row in the result
         resultSplitDates.forEach(function(row) {
            //Add table row for each result row
            table += '<tr>';
            var splitRow = row.attendancecsvwithheader.split(','); //Split the csv field
            var rowLen = splitRow.length;
            var spanIndex = 0;

            for(cell = 0; cell < rowLen; cell++) { //For each cell in the current row
               var title = '';
               var style = '';
               var spanWidth = 1;
               //Correctly format student names (lname, fnmame mname)
               var cellContents = splitRow[cell];
               if(splitRow[0] == '') {
                  spanWidth = monthSpanWidths[spanIndex].width;
                  spanIndex++;
               }
               if(splitRow[0] != '' && cell == 0) {
                  cellContents = splitRow[cell] + ', ' + splitRow[cell + 1] + ' ' + splitRow[cell + 2];
                  cell += 2;
               }
               if(splitRow[0] != '' && cell > 2) {
                  //Find the matching code description
                  //the some() method allows break-like behavior using return true
                  attnStatusRes.rows.some(function(row) {
                     if(row.status == cellContents) {
                        title = row.description;
                        return true;
                     }
                  });
                  //Check if this column is the first in the month, and add a left border
                  monthSpanWidths.some(function(row) {
                     if(row.col == cell) {
                        style = 'border-left: 2px solid #e0e0e0;';
                        return true;
                     }
                  });
               }
               //Generate table row based on non-empty properties
               table += '<td' + ' colspan=' + spanWidth;
               //Only add title/style properties if they are not empty
               if(title != '') {
                  table += ' title="' + title + '"';
               }
               if(style != '') {
                  table += ' style="' + style + '"';
               }
               table += ' >' + cellContents + '</td>';
            }
            table += '</tr>';
         });
         table += '</table>'
         //Set the response type to html since we are sending the striaght html taable
         response.header("Content-Type", "text/html");
         response.send(table);
      });
   });
});

// Imports a section roster from a given file
app.post('/importSectionRoster', function(request, response) {
   //Decrypt the password recieved from the client.  This is a temporary development
   //feature, since we don't have ssl set up yet
   var passwordText = sjcl.decrypt(superSecret, JSON.parse(request.query.password));

   //Connnection parameters for the Postgres client recieved in the request
   var config = createConnectionParams(request.query.user, request.query.database,
      passwordText, request.query.host, request.query.port);

   //Get file from client
   var file = request.query.file;

   //Pipe from file into staging table
   pg.connect(function(err, client, done) {
      if(err) {
         console.log(err);
      } else {
         var stream = client.query(copyFrom('Copy RosterStaging FROM STDIN'));
         var fileStream = fs.createReadStream(file);
         fileStream.on('error', done);
         stream.on('error', done);
         stream.on('end', done);
         fileStream.pipe(stream);
      }
   });

   //Setup for function importRoster
   var queryText = 'SELECT * FROM importRoster();';
   var queryParams = [];

   executeQuery(response, config, queryText, queryParams, function(result) {
   });

   //Set queryText to Truncate the RosterStaging table
   queryText = 'TRUNCATE TABLE RosterStaging;';
   queryParams = [];

   executeQuery(response, config, queryText, queryParams, function(result) {
      response.send(result);
   });
});

app.use(function(err, req, res, next) {
   console.error(err);
   res.status(500).send('Internal Server Error');
});

server = app.listen(80);
