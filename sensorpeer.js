configfile = './config.json';
//Enable full path
config = require(configfile);

_ = require('underscore/underscore.js')._;
Promise = require('es6-promise').Promise;
Events = require('./events.js');
d3 = require('d3');
proj4 = require('proj4');
http = require('http');
Cam = require('onvif').Cam;

WebSocket = require('websocket').client;
pg = require('pg').native;
//Set global dbUrl
GLOBAL.dbUrl = config.dbUrl;
//Set env var to accept all certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//Cow = require('./bower_components/cow/dist/cow.node.js');
Cow = require('/var/data/sites/cow/dist/cow.nodb.js');

core = new Cow.core({
    herdname: config.herdname,
    maxage: 1000 * 60 * 60 * 24 * 365 //one year 
});
if (!core.socketservers('default')){
   core.socketservers({
        _id: 'default', 
        data: {
        	protocol: config.protocol,
        	ip: config.ip, 
        	port: config.port,
        	dir: config.dir}
      });
};
core.socketserver('default');
core.connect();
core.userStore().synced.then(function(){
	var user = core.users({_id: 'geodan_entrancecam'});
	user.data({
			name: 'Geodan entrance cam',
			type: 'onvifcam',
			location: camcoords,
			stream: 'http://192.168.26.104/mjpg/video.mjpg?resolution=320x180&amp;compression=30&amp;rotation=0&amp;textstring=PAN%20%23x%20-%20TILT%20%23y%20-%20ZOOM%20%23z%20-%20TEMP_C%20%23TC1%20-%20FAN%20%23U1%20-%20PRESET%20%23P%20-%20Geodan%20BV%20-&amp;textsize=small&amp;textposition=top&amp;textbackgroundcolor=black&amp;textcolor=white&amp;text=1&amp;clock=1&amp;date=1&amp;overlayimage=0&amp;fps=0&amp;videokeyframeinterval=32&amp;videobitrate=0&amp;maxframesize=0&amp;timestamp=1453390661952'
	}).sync();
	core.user('geodan_entrancecam');
	console.log(core.users().length, ' users loaded');
 core.peer().data('family','stupid').sync();
        console.log('I am ', core.peer().data('family'));

});

core.projectStore().synced.then(function(){
	console.log(core.projects().length, ' projects loaded');
	core.peer().data('sensorpeer', true).sync();
	console.log('My peerid: ', core.peerid());
});   

function checkbait(p){
	p.itemStore().synced.then(function(){
		console.log('--------------');
		p.itemStore().on('datachange',function(){
			var cambait = p.items().filter(function(i){
					return i.data('type') == 'feature' && 
						i.data('feature').properties && 
						i.data('feature').properties.cambait;
			});
			if (cambait.length > 0){
				//console.log('we got bait!');
				var i = cambait[cambait.length-1]; //take the last one
				var feature = i.data('feature');
				if (feature.geometry.type = 'Point'){
					var coords = feature.geometry.coordinates;
					movecam(coords);
				}
			}
			
		});
	});
}

core.projectStore().synced.then(function(){
	core.projects()
		.filter(function(d){return !d.deleted();})
		.forEach(checkbait);
});

function movecam(coords){
	var toRD = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs <>";
	var camcoords_rd = proj4(toRD, camcoords); 
	var coords_rd = proj4(toRD, coords);
	//console.log('from: ',camcoords_rd, 'to: ',coords_rd);
	var dx = coords_rd[0] - camcoords_rd[0];
	var dy = coords_rd[1] - camcoords_rd[1];
	var distance = Math.abs(Math.hypot(dy, dx));
	var bearing = Math.atan2(dx,dy) * 180 / Math.PI;
    if (distance < 200){
    	var to_abs = d3.scale.linear().domain([-180,0,0,180]).range([180,360,0,180]);
    	var to_cam = d3.scale.linear().domain([-10,370]).range([-1,1]);
    	var to_zoom = d3.scale.linear().domain([0,200]).range([0,1]);
    	var to_tilt = d3.scale.sqrt().domain([0,50,200]).range([0,0.9,1])
    	var angle = to_cam(to_abs(bearing));
    	var zoom = to_zoom(distance);
    	var tilt = to_tilt(distance);
    	var command = {x:angle,y:tilt,z:zoom};
    	//console.log('Moving camera to ', command);
		entrancecam.absoluteMove(command);
    }
    
}

var camcoords =  [4.913130,52.342373];
 
var camheight = 7;

var entrancecam = new Cam({
  hostname: '192.168.26.104',
  username: 'onvifuser',
  password: 'onvifuser',
}, function(err) {
  this.absoluteMove({x: 1, y: 1, zoom: 1});
  this.getStatus(function(req,res){
  	console.log(req,res);
  });
  
  
  
  /*
  this.getStreamUri({protocol:'RTSP'}, function(err, stream) {
    http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<html><body>' +
        '<embed type="application/x-vlc-plugin" target="' + stream.uri + '"></embed>' +
        '</body></html>');
    }).listen(3389);
  });*/
});
