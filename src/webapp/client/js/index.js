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

/* 
Each instance of connInfo as a parameter in a function definition refers to an 
 object with the following keys, which are used as part of the REST API calls to
 the Gradebook server:
	"host":String, "port":Number, "database":String, "user":String,
	 "password":String, "instructorid":Number
*/


$(document).ready(function() {
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

				popYears(dbInfo);
			});
		}
		else {
			showAlert('<h5>Missing field(s)</h5><p>One or more fields are ' +
				'not filled in.</p><p>All fields are required, including those in ' +
				'DB Info.</p>');
		}
	});

	$('#yearSelect').change(function() {
		var year = $('#yearSelect').val();
		popSeasons(dbInfo, year);
	});

	$('#seasonSelect').change(function() {
		var year = $('#yearSelect').val();
		var season = $('#seasonSelect').val();
		listCourses(dbInfo, year, season);
	});

  var secReportOffset = 0;
  var secReportLimit = 100;
  $('#btnReportLeft').click(function() {
	  secReportOffset -= secReportLimit;

	  if (secReportOffset < 0) {
		  secReportOffset = 0;
	  }

	  $('#btnLoadSections').click();
  });

  $('#btnReportRight').click(function() {
	  secReportOffset += secReportLimit;

	  if (secReportOffset > sectionReportObj.SectionCount - secReportLimit) {
		  secReportOffset = sectionReportObj.SectionCount - secReportLimit;
	  }

	  $('#btnLoadSections').click();
  });

  $('#btnLoadSections').click(function() {
	  console.log("CourseCount: " + sectionReportObj.CourseCount);
	  var secReportRows = "";

	  $('#secReportoffset').html((secReportOffset + 1));

	  var lastSection = secReportOffset + secReportLimit;
	  if (lastSection > sectionReportObj.SectionCount) {
		  lastSection = sectionReportObj.SectionCount;
	  }

	  $('#secReportOffsetWLimit').html(lastSection);
	  $('#secReportTotal').html(sectionReportObj.SectionCount);

	  for(var i = 0; i < sectionReportObj.Sections.length; i++) {
		  secReportRows += '<tr>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].course + '</td>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].sectionnumber + '</td>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].title + '</td>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].schedule + '</td>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].location + '</td>';
		  secReportRows += '<td>' + sectionReportObj.Sections[i].instructors + '</td>';
		  secReportRows += '</tr>';
	  }
	  $('#secReportListingBody').html(secReportRows);
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

	$('#logout').click(function() {
		dbInfo = null;
		userInfo = null;
		setYears(null); //reset Attendance dropdowns


		$('#sectionListBody').html(''); //clear section list

		//hide and reset profile
		$('#profile').css('display', 'none');

		$('#givenName').html('');
		
		//show Login tab, hide Roster, Attendance, Grades, and Reports tabs
		$('#loginTab').css('display', 'inline');
		$('#rosterTab, #attnTab, #gradesTab, #reportsTab, #sectionReportTab').css('display', 'none');
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
	var data = $.extend({}, dbInfo, {data: result}, {name: fileName});
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
	userInfo.role = $('#roleSelect option:selected').val();

	//"create a copy" of connInfo with user's group role and set to urlParams
	var urlParams = $.extend({}, connInfo, {userRole:userInfo.role}); 

	$.ajax('login', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			//populate dbInfo and userInfo with info from response
			userInfo = { id:result.user.id, fname:result.user.fname, 
			mname:result.user.mname, lname:result.user.lname};

			//hide Login tab, show Roster, Attendance, Grades, and Reports tabs
			$('#loginTab').css('display', 'none');
			$('#rosterTab, #attnTab, #gradesTab, #reportsTab, #sectionReportTab').css('display', 'inline');
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

function popYears(connInfo) {
	$.ajax('years', {
		dataType: 'json',
		data: connInfo,
		success: function(result) {
			var years = '';
			for(var i = 0; i < result.years.length; i++) {
				years += '<option value="' + result.years[i] + '">' +
					result.years[i] + '</option>';
			}
			setYears(years);
		},
		error: function(result) {
			showAlert('<p>Error while retrieving years</p>');
			console.log(result);
		}
	});
};

function popSeasons(connInfo, year) {
	var urlParams = $.extend({}, connInfo, {year: year});
	$.ajax('seasons', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			var seasons = '';
			for(var i = 0; i < result.seasons.length; i++) {
				seasons += '<option value="' + result.seasons[i].seasonorder +
					'">' + result.seasons[i].seasonname + '</option>';
			}
			setSeasons(seasons);
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

function setYears(htmlText) {
	var content = '<option value="" disabled="true" selected="true">' +
		'Choose year</option>' + htmlText;
	$('#yearSelect').html(content);
	$('#yearSelect').prop('disabled', htmlText == null);
	$('#yearSelect').material_select(); //reload dropdown

	
	setSeasons(null); //reset dependent field
};

function setSeasons(htmlText) {
	var content = '<option value="" disabled="true" selected="true">' +
		'Choose season</option>' + htmlText;
	$('#seasonSelect').html(content);
	$('#seasonSelect').prop('disabled', htmlText == null);
	$('#seasonSelect').material_select(); //reload dropdown
	$('#sectionListBody').html(''); //clear section list
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

// Returns list of courses for a given user id
/*
function getStudentCourses(connInfo, year, seasonorder, userrole) {
	var urlParams = $.extend({}, connInfo, {year: year, seasonorder: seasonorder, userrole: userrole});
	$.ajax('courses', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			//TODO: Implement population of calendar
		},
		error: function(result) {
			showAlert('<p>Error while retrieving courses</p>');
			console.log(result);
		}
	});
};

// Returns sectionid and sectiontitle for a given course
function getStudentCourses(connInfo, year, seasonorder, coursenumber, userrole) {
	var urlParams = $.extend({}, connInfo, {
		year: year, seasonorder: seasonorder,
		coursenumber: coursenumber, userrole: userrole
	});
	$.ajax('sections', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			var sections = [];
			for(var i = 0; i < result.sections.length; i++) {
				sections.push({
					"sectionid": result.sections[i].sectiondid,
					"sectiontitle": result.sections[i].sectiontitle
				})
			}
			//TODO: Implement population of calendar
		},
		error: function(result) {
			showAlert('<p>Error while retrieving sections</p>');
			console.log(result);
		}
	});
};

// Returns lit of schedule dates for a given sectionid
function getStudentCourses(connInfo, sectionid) {
	var urlParams = $.extend({}, connInfo, {sectionid: sectionid});
	$.ajax('sectionsschedule', {
		dataType: 'json',
		data: urlParams,
		success: function(result) {
			var dates = [];
			for(var i = 0; i < result.classDates.length; i++) {
				sections.push(result.classDates[i]);
			}
			//TODO: Implement population of calendar
		},
		error: function(result) {
			showAlert('<p>Error while retrieving class dates</p>');
			console.log(result);
		}
	});
};
*/
