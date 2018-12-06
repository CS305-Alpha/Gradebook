/*
index.js - Gradebook

Andrew Figueroa
Data Science & Systems Lab (DASSL), Western Connecticut State University

Copyright (c) 2017- DASSL. ALL RIGHTS RESERVED.
Licensed to others under CC 4.0 BY-NC-SA
https://creativecommons.org/licenses/by-nc-sa/4.0/

ALL ARTIFACTS PROVIDED AS IS. NO WARRANTIES EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

This JavaScript file provides the client-side JS code that is used by the index.html
page. The functionality provided includes accessing the REST API provided by the web
server component of the Gradebook webapp, along with providing interactivity for the
index.html webpage. 
*/

/*
Currently, a globally scoped variable is used to store login information.
 At a later point, it may be stored through a more appropriate manner, such as
 client cookies.
*/
var dbInfo = {
	"host":null, "port":null, "database":null, "user":null, "password":null
};

var userInfo = {"id": null, "fname":null, "mname":null, "lname": null, "role": null};

var displayedSection = {"id":null, "sectioncourse":null, "sectionnumber":null,
	"sectiontitle":null, "sectionschedule":null, "sectionlocation":null,
	"sectioninstructors":null};

var secReportOffset = 0;
var secReportLimit = 20;
var secReportCount = 0;

$(document).ready(function() {
	var secondaryColor = "secondary-color";

	$('.btn').addClass(secondaryColor);
	$('.btn-floating').addClass(secondaryColor);
	$('.card-panel').addClass(secondaryColor);

	$('select').material_select(); //load dropdown boxes

	$('#dbInfoBox').collapsible({
		onOpen: function() {
			$('#dbInfoArrow').html('keyboard_arrow_up');
		},
		onClose: function() {
			$('#dbInfoArrow').html('keyboard_arrow_down');
		}
	});

	$('#attnOptionsBox').collapsible({
		onOpen: function() {
			$('#optionsArrow').html('keyboard_arrow_up');
		},
		onClose: function() {
			$('#optionsArrow').html('keyboard_arrow_down');
		}
	});

	$('#rosterBox').collapsible({
		onOpen: function() {
			$('#rosterUploadArrow').html('keyboard_arrow_up');
		},
		onClose: function() {
			$('#rosterUploadArrow').html('keyboard_arrow_down');
    }
  });

	$('#email').keyup(function(event) {
		if (event.keyCode == 13) {
			$('#btnLogin').click();
		}
	});

	$('#passwordBox').keyup(function(event) {
		if (event.keyCode == 13) {
			$('#btnLogin').click();
		}
	});

	$('#btnLogin').click(function() {
		dbInfo = getDBFields();
		var issuedID = $('#schoolIssuedID').val().trim();
		if (dbInfo != null && issuedID != '') {
			serverLogin(dbInfo, issuedID, function() {
				//clear login fields and close DB Info box
				$('#schoolIssuedID').val('');
				$('#passwordBox').val('');
				$('#dbInfoBox').collapsible('close', 0);
				$('#dbInfoArrow').html('keyboard_arrow_down');

				$('#calendar').fullCalendar({});
				$("#calendar").css({"visibility": "hidden"});

				popYears(dbInfo, '#yearSelect');
				popYears(dbInfo, '#calendarSelectYear');
				popYears(dbInfo, '#secReportYear'); //currently only populates user years, should populate institution years
				setSeasons(null, '#yearSelect');
			});
		}
		else {
			showAlert('<h5>Missing field(s)</h5><p>One or more fields are ' +
				'not filled in.</p><p>All fields are required, including those in ' +
				'DB Info.</p>');
		}
	});

	$('#calendarSelectYear').change(function() {
		var year = $('#calendarSelectYear').val();
		popSeasons(dbInfo, year, '#calendarSelectSeason');
	});

	$('#calendarSelectSeason').change(function() {
		var season = $('#calendarSelectSeason option:selected').val();
		var year = $('#calendarSelectYear option:selected').val();
		var userrole = $('#roleSelect option:selected').val();

		$("#calendar").css({"visibility": "visible"});
		$('#calendar').fullCalendar( 'render' );

		// grab data and populate calendar
		getSectionIDs(dbInfo, year, season, userrole);
	})

	$('#yearSelect').change(function() {
		var year = $('#yearSelect').val();
		popSeasons(dbInfo, year, '#seasonSelect');
		$('#sectionListBody').html(''); //clear section list
	});

	$('#seasonSelect').change(function() {
		var year = $('#yearSelect').val();
		var season = $('#seasonSelect').val();
		$('#sectionListBody').html(''); //clear section list
		listCourses(dbInfo, year, season);
	});

	$('#btnReportLeft').click(function() {
		if (secReportOffset > 0) {
			secReportOffset -= secReportLimit;

			if (secReportOffset < 0) {
				secReportOffset = 0;
			}
	
			var year = $('#secReportYear').val();
			var season = $('#secReportSeason').val();
	
			$('#secReportListing').fadeOut(200, function() {
				popSecReport(dbInfo, year, season, secReportOffset, secReportLimit, function() {
					$('#secReportListing').fadeIn(200);
				});
			});
		}
	});

	$('#btnReportRight').click(function() {
		if (secReportOffset < secReportCount - secReportLimit) {
			secReportOffset += secReportLimit;

			if (secReportOffset > secReportCount - secReportLimit) {
				secReportOffset = secReportCount - secReportLimit;
			}
	
			var year = $('#secReportYear').val();
			var season = $('#secReportSeason').val();
			$('#secReportListing').fadeOut(200, function() {
				popSecReport(dbInfo, year, season, secReportOffset, secReportLimit, function() {
					$('#secReportListing').fadeIn(200);
				});
			});
		}
	});

	$('#secReportLimitSelect').change(function() {
		secReportLimit = parseInt($('#secReportLimitSelect').val());

		var year = $('#secReportYear').val();
		var season = $('#secReportSeason').val();
		$('#secReportListing').fadeOut(200, function() {
			popSecReport(dbInfo, year, season, secReportOffset, secReportLimit, function() {
				$('#secReportListing').fadeIn(200);
			});
		});
	});

	$('#btnReturnToSelect').click(function() {
		$('#currentSelection').slideUp(500, function() {
			$('#attnOptionsBox-wrapper').fadeOut();
			$('#attendanceData').fadeOut();
			$('#sectionListing').slideDown(500);
		});
	});

	$('#opt-showPresent, #opt-compactTab').change(function() {
		//reload attendance table since options were modified
		popAttendance(dbInfo, displayedSection);
	});

	$('#secReportYear').change(function() {
		var year = $('#secReportYear').val();
		popSeasons(dbInfo, year, '#secReportSeason');
		$('#secReportTableWrapper').fadeOut(500, function() {
			$('#secReportListingBody').html(''); //clear section list
		});
	});

	$('#secReportSeason').change(function() {
		var year = $('#secReportYear').val();
		var season = $('#secReportSeason').val();
		
		$('#secReportTableWrapper').fadeOut(500, function() {
			$('#currSectionReport').fadeOut(200);
			$('#secReportListingBody').html('');
			popSecReport(dbInfo, year, season, secReportOffset, secReportLimit, function(termSummary) {
				secReportCount = termSummary.SectionCount;
		
				var lastSection = secReportOffset + secReportLimit;
				if (lastSection > secReportCount) {
					lastSection = secReportCount;
				}

				var summary = '';
				summary += '<h4>' + $('#secReportSeason option:selected').text() + ' ' + year + "</h4>";
				summary += "<ul>"
				summary += "<li><strong>Course count: </strong>" + termSummary.CourseCount + "</li>";
				summary += "<li><strong>Section count: </strong>" + termSummary.SectionCount + "</li>";
				summary += "<li><strong>Instructor count: </strong>" + termSummary.InstructorCount + "</li>";
				summary += "<li><strong>Student count: </strong>" + termSummary.StudentCount + "</li>";
				summary += "</ul>";
				$('#secReportTerm').html(summary);

				$('#secReportTableWrapper, #currSectionReport').fadeIn(500);
			});
		});
	});

	$('#logout').click(function() {
		dbInfo = null;
		userInfo =  {"id": null, "fname":null, "mname":null, "lname": null, "role": null};
		setYears(null); //reset Attendance dropdowns

		//clear section lists
		$('#sectionListBody').html('');
		$('#secReportListingBody, #secReportTotal, #secReportOffsetWLimit, #secReportoffset, #secReportTerm').html('');
		$('#currSectionReport, #secReportTableWrapper').css('display', 'none');
		setYears(null, '#secReportYear');
		setSeasons(null, '#secReportSeason');

		//hide and reset profile
		$('#profile').css('display', 'none');
		$('#givenName').html('');
		
		//show Login tab, hide Roster, Attendance, Grades, and Reports tabs
		$('#loginTab').css('display', 'inline');
		$('#rosterTab, #attnTab, #gradesTab, #reportsTab, #sectionReportTab, #scheduleTab').css('display', 'none');
		$('ul.tabs').tabs('select_tab', 'login');
	});

	$('#uploadBtn').click(function()
	{
		dbInfo = getDBFields();
		var file = document.getElementById('rosterImport').files[0];
		var reader = new FileReader();
		reader.readAsText(file, 'UTF-8');
		reader.onload = uploadRoster;
	});

});

function uploadRoster(event){
	var result = event.target.result;
	var fileName = document.getElementById('rosterImport').files[0].name;
	var data = $.extend({}, dbInfo, {data: result, name: fileName,
		"year": $('#rosterYear').val(),
		"season": $('#rosterSeason').val(),
		"course": $('#rosterCourse').val(),
		"sectionNumber": $('#rosterSection').val()
	});

	$.post('/importSectionRoster', data, showAlert("<p>Upload Successful.</p>"));
};

function showAlert(htmlContent) {
	$('#genericAlertBody').html(htmlContent);
	$('#msg-genericAlert').modal('open');
};

function getDBFields() {
	var host = $('#host').val().trim();
	var port = $('#port').val().trim();
	var db = $('#database').val().trim();
	var uname = $('#schoolIssuedID').val().trim();
	var pw =  $('#passwordBox').val().trim();
	
	if (host === "" || port === "" || db === "" || uname === "" || pw === "") {
		return null;
	}

	pw = JSON.stringify(sjcl.encrypt('dassl2017', pw));

	var connInfo = {
		'host': host, 'port': parseInt(port, 10), 'database': db,
		'user': uname, 'password': pw
	};
	return connInfo;
};

function serverLogin(connInfo, email, callback) {
	var groupRole = $('#roleSelect option:selected').val();

	//"create a copy" of connInfo with user's group role and set to urlParams
	var urlParams = $.extend({}, connInfo, {userRole:groupRole}); 

	$.ajax('login', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			//populate dbInfo and userInfo with info from response
			userInfo = { id:result.user.id, fname:result.user.fname, 
			mname:result.user.mname, lname:result.user.lname,
			role:$('#roleSelect option:selected').val()};

			//hide Login tab, show Roster, Attendance, Grades, and Reports tabs
			$('#loginTab').css('display', 'none');
			$('#rosterTab, #attnTab, #gradesTab, #reportsTab, #sectionReportTab, #scheduleTab').css('display', 'inline');
			$('ul.tabs').tabs('select_tab', 'attendance');
			
			//populate user given name and display profile (including logout menu)
			//Array.prototype.join is used because in JS: '' + null = 'null'
			var givenName = [userInfo.fname, userInfo.mname, userInfo.lname].join(' ');
			$('#givenName').html(givenName);
			$('#profile').css('display', 'inline');

			callback();
		},
		error: function(result) {
			//currently does not distinguish between credential and connection errors
			showAlert('<h5>Could not login</h5><p>Login failed - ensure ' +
				'all fields are correct</p>');
			console.log(result);
		}
	});
};

function popYears(connInfo, select) {
	var urlParams = $.extend({}, connInfo, {userID:userInfo.id, userRole:userInfo.role});

	$.ajax('years', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			var years = '';
			for(var i = 0; i < result.years.length; i++) {
				years += '<option value="' + result.years[i] + '">' +
					result.years[i] + '</option>';
			}
			setYears(years, select);
		},
		error: function(result) {
			showAlert('<p>Error while retrieving years</p>');
			console.log(result);
		}
	});
};

function popSeasons(connInfo, year, select) {
	var urlParams = $.extend({}, connInfo, {year: year, userID:userInfo.id, userRole:userInfo.role});
	$.ajax('seasons', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			var seasons = '';
			for(var i = 0; i < result.seasons.length; i++) {
				seasons += '<option value="' + result.seasons[i].seasonorder +
					'">' + result.seasons[i].seasonname + '</option>';
			}
			setSeasons(seasons, select);
		},
		error: function(result) {
			showAlert('<p>Error while retrieving seasons</p>');
			console.log(result);
		}
	});
};


function popAttendance(connInfo, section) {
	if (typeof(section) !== "object") {
		section = JSON.parse(section);
	}
	displayedSection = section;
	$('#currentSection').html('<h4>' + displayedSection.sectioncourse + "-" +
	 displayedSection.sectionnumber + " " + displayedSection.sectiontitle +
	  ' | ' + $('#seasonSelect option:selected').text() + " " + $('#yearSelect').val() + '</h4>');

	$('#sectionListing').slideUp(500, function() {
		$('#currentSelection').slideDown(500);
	});

	var urlParams = $.extend({}, connInfo, {sectionid:section.sectionid});
	$.ajax('attendance', {
		dataType: 'html',
		data: urlParams,
		success: function(result) {
			setAttendance(result);
		},
		error: function(result) {
			if (result.responseText == '500 - No Attenance Records') {
				showAlert('<p>No attendance records exist for this section</p>');
			}
			else {
				showAlert('<p>Error while retrieving attendance data</p>');
			}
			setAttendance(null);
			console.log(result);
		}
	});
};

function listCourses(connInfo, year, seasonorder) {
	$('#sectionListBody').html(''); //clear list of sections
	$('#sectionListingTable').slideDown('slow');

	var userRole = $('#roleSelect option:selected').val();
	var urlParams = $.extend({}, connInfo, {userid:userInfo.id, year:year, seasonorder:seasonorder, userRole:userRole});

	//promises would be helpful here to avoid having 7 levels of indentation
	$.ajax('courses', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			result.courses.sort();
			for (var i = 0; i < result.courses.length; i++) {
				 var sectionParams = $.extend({}, urlParams, {coursenumber:result.courses[i]});
				$.ajax('sections', {
					dataType: 'json',
					data: sectionParams,
					success: function(result) {
						addResultToSectionList(result)
					},
					error: function(result) {
						showAlert('<p>Error while retrieving sections</p>');
						console.log(result);
					}
				});
			}
		},
		error: function(result) {
			showAlert('<p>Error while retrieving courses</p>');
			console.log(result);
		}
	});
};


function addResultToSectionList(result) {
	//sort sections based on section number
	result.sections.sort(function (a,b) {
		return a.sectionnumber < b.sectionnumber;
	});

	//build table row for each section
	var sections = '';
	for (var j = 0; j < result.sections.length; j++) {
		var sectionObjStr = JSON.stringify(result.sections[j]).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
		sections += '<tr onclick="popAttendance(dbInfo, \'' + sectionObjStr + '\')"';
		sections += 	' onmouseover="" style="cursor: pointer;">';
		sections += '<td>' + result.sections[j].sectioncourse + '</td>';
		sections += '<td>' + result.sections[j].sectionnumber + '</td>';
		sections += '<td>' + result.sections[j].sectiontitle + '</td>';
		sections += '<td>' + result.sections[j].sectionschedule + '</td>';
		sections += '<td>' + result.sections[j].sectionlocation + '</td>';
		sections += '<td>' + result.sections[j].sectioninstructors + '</td>';
		sections += '</tr>';
	}

	//append new section to section list
	appendSectionList(sections);
}

function appendSectionList(htmlText) {
	var currList = $('#sectionListBody').html();
	$('#sectionListBody').html(currList + htmlText);
};

function setYears(htmlText, select) {
	var content = '<option value="" disabled="true" selected="true">' +
		'Choose year</option>' + htmlText;
	$(select).html(content);
	$(select).prop('disabled', htmlText == null);
	$(select).material_select(); //reload dropdown

	
	setSeasons(null); //reset dependent field
};

function setSeasons(htmlText, select) {
	var content = '<option value="" disabled="true" selected="true">' +
		'Choose season</option>' + htmlText;
	$(select).html(content);
	$(select).prop('disabled', htmlText == null);
	$(select).material_select(); //reload dropdown
};

function setAttendance(htmlText) {
	var showPs = $('#opt-showPresent').is(':checked');
	var isCompact = $('#opt-compactTab').is(':checked');

	if(htmlText == null) {
		$('#attendanceData').html('');
		$('#attnOptionsBox-wrapper').fadeOut();
	}
	else {
		if(htmlText.substring(0, 7) !== '<table>') {
			console.log('WARN: setAttendance(): Unable to style attendance table;' +
				' first 7 chars did not match "<table>"');
		}
		else {
			if(!showPs) {
				//replace all 'P' fields with a space
				htmlText = htmlText.replace(/>P<\/td>/g, '> </td>');
			}
			if(isCompact) {
				//add attibutes to <table> tag to use compact framework styling
				htmlText = '<table class="striped" style="line-height:1.1;">' +
					htmlText.substring(7);

				//give all td tags the "compact" class
				htmlText = htmlText.replace(/<td /g, '<td class="compact" ');
			}
			else {
				//add attibutes to <table> tag to use non-compact framework styling
				htmlText = '<table class="striped">' + htmlText.substring(7);
			}
		}
		$('#attendanceData').html(htmlText);
		$('#attnOptionsBox-wrapper').fadeIn();
		$('#attendanceData').fadeIn();
	}
};
function popSecReport(conninfo, year, season, offset, limit, callback) {
	var secReportParams = $.extend({}, conninfo, {year:year, season:season, offset:offset, limit:limit});
	
	$.ajax('sectionreport', {
		dataType: 'json',
		data: secReportParams,
		success: function(result) {
			var secReportRows = "";
			for(var i = 0; i < result.Sections.length; i++) {
				secReportRows += '<tr>';
				secReportRows += '<td>' + result.Sections[i].course + '</td>';
				secReportRows += '<td>' + result.Sections[i].sectionnumber + '</td>';
				secReportRows += '<td>' + result.Sections[i].title + '</td>';
				secReportRows += '<td>' + result.Sections[i].schedule + '</td>';
				secReportRows += '<td>' + result.Sections[i].location + '</td>';
				secReportRows += '<td>' + result.Sections[i].instructors + '</td>';
				secReportRows += '</tr>';
			}
		
			var lastSection = offset + limit;
			if (lastSection > result.SectionCount) {
				lastSection = result.SectionCount;
			}
			secReportCount = result.SectionCount;

			$('#secReportListingBody').html(secReportRows);
			$('#secReportOffsetDisp').html(offset + 1);
			$('#secReportOffsetWLimit').html(lastSection);
			$('#secReportTotal').html(secReportCount);
		
			if (typeof(callback) === 'function') {
				var termSummary = {
					"CourseCount":result.CourseCount,
					"SectionCount":result.SectionCount,
					"InstructorCount":result.InstructorCount,
					"StudentCount":result.StudentCount
				};
				callback(termSummary);
			}
		},
		error: function(result) {
			showAlert('<p>Error while retrieving section report</p>');
			console.log(result);
		}
	});
};

// Assuming 'sections' endpoint gives all the sections(title and id) that the user is currently enrolled in
// for a given year and season
function getSectionIDs(connInfo, year, seasonorder, userrole) {
	var userRole = $('#roleSelect option:selected').val();
	var urlParams = $.extend({}, connInfo, {userid:userInfo.id, year:year, seasonorder:seasonorder, userRole:userRole});

	//promises would be helpful here to avoid having 7 levels of indentation
	$.ajax('courses', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			result.courses.sort();
			for (var i = 0; i < result.courses.length; i++) {
				 var sectionParams = $.extend({}, urlParams, {coursenumber:result.courses[i]});
				$.ajax('sections', {
					dataType: 'json',
					data: sectionParams,
					success: function(result) {
						for(var i = 0; i < result.sections.length; i++) {
							getSectionDates(connInfo, result.sections[i].sectionid, result.sections[i].sectiontitle);
						}
					},
					error: function(result) {
						showAlert('<p>Error while retrieving sections</p>');
						console.log(result);
					}
				});
			}
		},
		error: function(result) {
			showAlert('<p>Error while retrieving courses</p>');
			console.log(result);
		}
	});
};

// Returns list of schedule dates for a given sectionid
function getSectionDates(connInfo, sectionid, sectiontitle) {
	var urlParams = $.extend({}, connInfo, {sectionid: sectionid});
	$.ajax('sectionschedule', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			for(var i = 0; i < result.classDates.length; i++) {
				var event = {id: i, title: sectiontitle, start: result.classDates[i]};
				$('#calendar').fullCalendar('renderEvent', event, true);
			}
		},
		error: function(result) {
			showAlert('<p>Error while retrieving class dates</p>');
			console.log(result);
		}
	});
};
