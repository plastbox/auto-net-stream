/* jshint node:true */
'use strict';

const ssdp = require('node-ssdp').Client;
//var net = require('net');
const http = require('http');
const querystring = require('querystring');
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
		}, 100)
	}
	searches.push(search);
	this.search(searchString);
};
ssdpClient.on('response', function inResponse(headers, code, rinfo) {
	//console.log('Got a response to an m-search:', code, headers, rinfo);
	//console.log('Got a response to an m-search:', headers.ST, headers.USN);
	searches.forEach((search) => {
		if(search.matcher.test(headers.ST)) {

			search.result[headers.USN+headers.ADDRESS+headers.PORT] = {headers: headers, code: code, rinfo: rinfo};

			/*if(search.result.filter((res) => res.headers.USN == headers.USN).length === 0) {
				search.result.push({headers: headers, code: code, rinfo: rinfo});
				console.log('Got a response to an m-search:', headers.USN);
			}*/
			clearTimeout(search.tmrResolve);
			search.tmrResolve = setTimeout(()=>{
				search.callback(null, Object.keys(search.result).map(function(key) { return search.result[key]; }));
				//console.log(require('util').inspect(search.result, {depth: 10, colors: true}));
				/*search.result.forEach((args) => {
					search.callback.apply(this, args);
				});*/
				searches.splice(searches.indexOf(search), 1);
			}, 100);
		}
	});
});

module.exports = function(opt, callback) {
	if(!opt.servicename) {
		throw('Missing service name');
	}
	if(!opt.start) {
		opt.start = Date.now();
	}

	var created = false;
	ssdpClient.findServices('urn:schemas-upnp-org:device:' + opt.servicename, function(err, res) {
		if(err) {
			throw(err);
		}
		console.log(res);
		var r = res[Math.floor(Math.random() * res.length)];
		if(!created) {
			created = true;

			var options = {
				host: r.headers.ADDRESS,
				port: r.headers.PORT,
				path: '/?' + querystring.stringify(opt),
//TODO?				headers: [{'Transfer-Encoding': 'chunked'}]
			};
			
			http.request(options, function(res) {
				callback(res);
			}).end();
		}
	});
}