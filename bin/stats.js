#!/usr/bin/env node
/* jshint node:true */
'use strict';

const ssdp = require('node-ssdp').Client;
var http = require('http');

var ssdpClient = new ssdp({
	explicitSocketBind: true
});
/*ssdpClient.on('notify', function () {
	console.log('Got a notification.');
}).on('end', function() {
	console.log('stop ssdpcli');
});*/

var searches = [];
ssdpClient.findServices = function(searchString, callback) {
	var search = {
		searchString: searchString,
		matcher: new RegExp('\^' + searchString.replace(/\*/g, '\[\\w\\d\\-\]\*') + '\$','i'),
		callback: callback,
		result: {},
		tmrResolve: setTimeout(()=>{
			console.log('Resolve search (empty)');
			searches.splice(searches.indexOf(search), 1)
		}, 500)
	}
	searches.push(search);
	this.search(searchString);
};
ssdpClient.on('response', function inResponse(headers, code, rinfo) {
	//console.log('Got a response to an m-search:', code, headers, rinfo);
	//console.log('Got a response to an m-search:', headers.ST);
	searches.forEach((search) => {
		if(search.matcher.test(headers.ST)) {
			search.result[headers.USN+headers.ADDRESS+headers.PORT] = {headers: headers, code: code, rinfo: rinfo};
			clearTimeout(search.tmrResolve);
			search.tmrResolve = setTimeout(()=>{
				search.callback(null, Object.keys(search.result).map(function(key) { return search.result[key]; }));
				searches.splice(searches.indexOf(search), 1);
			}, 100);
		}
	});
});

ssdpClient.findServices('urn:schemas-upnp-org:device:*', function(err, res) {
	//console.log('Got a response to an m-search: ', headers, code, rinfo);
	//console.log(headers.USN, headers.SERVICENAME + "\t" + headers.ADDRESS + ':' + headers.PORT + "\thttp://" + headers.LOCATION);
	if(err) {
		throw(err);
	}
	res.sort(function(a,b) {
		return a.headers.SERVICENAME == b.headers.SERVICENAME ? 0 : a.headers.SERVICENAME > b.headers.SERVICENAME ? 1 : -1;
	}).forEach(function(r) {
		var options = {
			host: r.headers.ADDRESS,
			port: r.headers.PORT,
			path: '/stats'
		};

		http.request(options, function(response) {
			var str = '';	

			//another chunk of data has been recieved, so append it to `str`
			response.on('data', function (chunk) {
				str += chunk;
			});

			//the whole response has been recieved, so we just print it out here
			response.on('end', function () {
				//console.log((r.headers.ADDRESS + ':' + r.headers.PORT + '/' + r.headers.SERVICENAME + (new Array(51)).join(' ')).substr(0, 50), str);
				console.log(r.headers.ADDRESS + '\t' + r.headers.PORT + '\t' + (r.headers.SERVICENAME + (new Array(51)).join(' ')).substr(0, 50), str);
			});
		}).end();
	});
});