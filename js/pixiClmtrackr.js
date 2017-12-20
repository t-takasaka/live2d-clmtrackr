PIXI.loader.add('moc', "assets/Koharu/Koharu.moc3", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER })
PIXI.loader.add('texture', "assets/Koharu/Koharu.png")
PIXI.loader.add('motion', "assets/Koharu/Koharu.motion3.json", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON });
PIXI.loader.once('complete', onComplate);
PIXI.loader.load();
function onComplate(loader, resources) {
	var app = new PIXI.Application(1280, 720, { transparent: true });
	document.body.appendChild(app.view);
	var moc = LIVE2DCUBISMCORE.Moc.fromArrayBuffer(resources['moc'].data);
	var model = new LIVE2DCUBISMPIXI.ModelBuilder()
		.setMoc(moc)
		.setTimeScale(1)
		.addTexture(0, resources['texture'].texture)
		.build();

	app.stage.addChild(model);
	app.stage.addChild(model.masks);
	app.ticker.add(function (deltaTime) {
		model.update(deltaTime);
		model.masks.update(app.renderer);
	});

	var init = function(stream){
		if ("srcObject" in webcam) {
			webcam.srcObject = stream;
		} else {
			webcam.src = (window.URL && window.URL.createObjectURL(stream));
		}
		webcam.onloadedmetadata = function() {
			webcam.play();
		}
		webcam.onresize = function() {
			ctrack.stop();
			ctrack.reset();
			ctrack.start(webcam);
		}
	};
	var update = function() {
		window.requestAnimFrame(update);
		overlayContext.clearRect(0, 0, webcam.width, webcam.height);
/*
		//mosaic
		if(webcam.width > 0){
			var mosaicSize = 40;
			mosaicContext.drawImage(webcam, 0, 0, webcam.width, webcam.height);
			var src = mosaicContext.getImageData(0, 0, webcam.width, webcam.height);
			var dest = mosaicContext.createImageData(webcam.width, webcam.height);
			for (var y = 0; y < webcam.height; y++) {
				var sy = (y - y % mosaicSize) * webcam.width;
				var dy = y * webcam.width;
				for (var x = 0; x < webcam.width; x++) {
					var i = (sy + (x - x % mosaicSize)) * 4;
					var j = (dy + x) * 4;
					dest.data[j] = src.data[i];
					dest.data[j + 1] = src.data[i + 1];
					dest.data[j + 2] = src.data[i + 2];
					dest.data[j + 3] = 255;
				}
			}
			overlayContext.putImageData(dest, 0, 0);
		}
*/
		//Calcate parameters
		var pos = ctrack.getCurrentPosition();
		if(pos){
			var faceR = pos[62][0] - pos[2][0];
			var faceL = pos[12][0] - pos[62][0];
			var vecR = [pos[2][0] - pos[7][0], pos[2][1] - pos[7][1]];
			var vecL = [pos[12][0] - pos[7][0], pos[12][1] - pos[7][1]];
			var lipH = pos[53][1] - pos[57][1];
			var eyeHR = pos[26][1] - pos[24][1];
			var eyeHL = pos[31][1] - pos[29][1];

			params["PARAM_ANGLE_X"] = 90 * (faceL - faceR) / (faceL + faceR);
			params["PARAM_ANGLE_Y"] = -90 * (vecL[0] * vecR[0] + vecL[1] * vecR[1]) / Math.sqrt(vecL[0] * vecL[0] + vecL[1] * vecL[1]) / Math.sqrt(vecR[0] * vecR[0] + vecR[1] * vecR[1]);
			params["PARAM_ANGLE_Z"] = -90 * (pos[33][0] - pos[62][0]) / (pos[33][1] - pos[62][1]);
			params["PARAM_MOUTH_OPEN_Y"] = (pos[57][1] - pos[60][1]) / lipH - 0.5;
			params["PARAM_MOUTH_FORM"] = 2 * (pos[50][0] - pos[44][0]) / (pos[30][0] - pos[25][0]) - 1;
			params["PARAM_EYE_BALL_X"] = (pos[27][0] - pos[23][0]) / (pos[25][0] - pos[23][0]) - 0.5;
			params["PARAM_EYE_BALL_Y"] = (pos[27][1] - pos[24][1]) / eyeHL - 0.5;
			params["PARAM_EYE_L_OPEN"] = 0.7 * eyeHL / lipH;
			params["PARAM_EYE_R_OPEN"] = 0.7 * eyeHR / lipH;
			params["PARAM_BROW_L_Y"] = 2 * (pos[24][1] - pos[21][1]) / lipH - 4;
			params["PARAM_BROW_R_Y"] = 2 * (pos[29][1] - pos[17][1]) / lipH - 4;

			for (key in params) {
				var param = params[key];
				if(typeof(param) == 'number' && isFinite(param)){
					var index = model.parameters.ids.indexOf(key);
					if (index >= 0) { model.parameters.values[index] = param * 1.5; }
				}
			}
			ctrack.draw(overlay); 
		}
	}
	var resize = function (event) {
		if (event === void 0) { event = null; }
		var width = window.innerWidth;
		var height = (width / 16.0) * 9.0;
		app.view.style.width = width + "px";
		app.view.style.height = height + "px";
		app.renderer.resize(width, height);
		model.position = new PIXI.Point((width * 0.25), (height * 0.5));
		model.scale = new PIXI.Point((model.position.x * 1.7), (model.position.x * 1.7));
		model.masks.resize(app.view.width, app.view.height);

		mosaic.width = overlay.width = webcam.width = width / 2.0;
		mosaic.height = overlay.height = webcam.height = webcam.width * 3.0 / 4.0;
		mosaic.style.top = overlay.style.top = webcam.style.top = (height - webcam.height) + "px";
		mosaic.style.left = overlay.style.left = webcam.style.left = (width - webcam.width) + "px";
		ctrack.stop();
		ctrack.reset();
		ctrack.start(webcam);
	};

	//Select front camera
	if (navigator.mediaDevices) {
		navigator.mediaDevices.getUserMedia({video : { facingMode: "user" }}).then(init);
	} else if (navigator.getUserMedia) {
		navigator.getUserMedia({video : { facingMode: "user" }}, init);
	}

	var webcam = document.querySelector('#webcam');
	var overlay = document.querySelector('#overlay');
	var overlayContext = overlay.getContext('2d');
	var mosaic = document.createElement('canvas');
	var mosaicContext = mosaic.getContext('2d');
	var ctrack = new clm.tracker();
	var params = {};

	webcam.play();
	ctrack.init(pModel);
	ctrack.start(webcam);
	update();

	resize();
	window.onresize = resize;
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;
