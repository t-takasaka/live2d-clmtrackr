PIXI.loader.add('moc', "assets/Haru/Haru.moc3", { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BUFFER })
PIXI.loader.add('texture0', "assets/Haru/Haru_00.png")
PIXI.loader.add('texture1', "assets/Haru/Haru_01.png")
PIXI.loader.add('texture2', "assets/Haru/Haru_02.png")
PIXI.loader.once('complete', onComplate);
PIXI.loader.load();
function onComplate(loader, resources) {
	var app = new PIXI.Application(1280, 720, { transparent: true });
	var moc = LIVE2DCUBISMCORE.Moc.fromArrayBuffer(resources['moc'].data);
	var model = new LIVE2DCUBISMPIXI.ModelBuilder()
		.setMoc(moc)
		.setTimeScale(1)
		.addTexture(0, resources['texture0'].texture)
		.addTexture(1, resources['texture1'].texture)
		.addTexture(2, resources['texture2'].texture)
		.build();

	app.stage.addChild(model);
	app.stage.addChild(model.masks);
	app.ticker.add(function (deltaTime) {
		model.update(deltaTime);
		model.masks.update(app.renderer);
	});

	//Hide body
	var opacities = {};
	opacities["PARTS_01_ARM_R_B_001"] = 0;
	opacities["PARTS_01_ARM_L_B_001"] = 0;
	opacities["PARTS_01_ARM_R_A_001"] = 0;
	opacities["PARTS_01_ARM_L_A_001"] = 0;
	opacities["PARTS_01_BODY_001"] = 0;
	opacities["PARTS_01_NECK_001"] = 0;

	for (key in opacities) {
		var index = model.parts.ids.indexOf(key);
		if (index >= 0) { model.parts.opacities[index] = 0; }
	}

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

		if(webcam.width > 0){
/*
			//mosaic
			var mosaicSize = 30;
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
*/
			overlayContext.drawImage(app.view, 0, 0);
		}

		var pos = ctrack.getCurrentPosition();
		if(pos){
			var faceL = pos[62][0] - pos[2][0];
			var faceR = pos[12][0] - pos[62][0];
			var vecL = [pos[2][0] - pos[7][0], pos[2][1] - pos[7][1]];
			var vecR = [pos[12][0] - pos[7][0], pos[12][1] - pos[7][1]];
			var lipH = pos[53][1] - pos[57][1];
			var eyeHL = pos[26][1] - pos[24][1];
			var eyeHR = pos[31][1] - pos[29][1];

			var params = {};
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

			//Set model scale
			var scale = (pos[13][0] - pos[1][0]);
			if(typeof(scale) == 'number' && isFinite(scale)){ 
				model.scale.x = model.scale.y = scale * 5.0; 

				//Set model pos
				var posx = (pos[13][0] - pos[1][0]) * 0.5 + pos[1][0];
				var posy = (pos[33][1] - pos[7][1]) * 0.5 + pos[7][1];
				if(typeof(posx) == 'number' && isFinite(posx)){ model.position.x = posx; }
				if(typeof(posy) == 'number' && isFinite(posy)){ model.position.y = posy + 2.0 * scale; }
			}

			ctrack.draw(overlay); 
		}
	}
	var resize = function (event) {
		if (event === void 0) { event = null; }
		var width = window.innerWidth;
		var height = (width / 16.0) * 9.0;

		mosaic.width = overlay.width = webcam.width = app.view.width = width;
		mosaic.height = overlay.height = webcam.height = app.view.height = webcam.width * 3.0 / 4.0;
		mosaic.style.top = overlay.style.top = webcam.style.top = app.view.style.top = "0px";
		mosaic.style.left = overlay.style.left = webcam.style.left = app.view.style.left = "0px";

		app.renderer.resize(width, webcam.width * 3.0 / 4.0);
		model.position = new PIXI.Point((width * 0.5), (height * 0.5));
		model.scale = new PIXI.Point(0, 0);
		model.masks.resize(app.view.width, app.view.height);

		ctrack.stop();
		ctrack.reset();
		ctrack.start(webcam);
	};

	//Select camera
	if (navigator.mediaDevices) {
		navigator.mediaDevices.getUserMedia({video : { facingMode: "user" }}).then(init); //front camera
		//navigator.mediaDevices.getUserMedia({video : { facingMode: "environment" }}).then(init); //back camera
	} else if (navigator.getUserMedia) {
		navigator.getUserMedia({video : { facingMode: "user" }}, init); //front camera
		//navigator.getUserMedia({video : { facingMode: "environment" }}, init); //back camera
	}

	var webcam = document.querySelector('#webcam');
	var overlay = document.querySelector('#overlay');
	var overlayContext = overlay.getContext('2d');
	var mosaic = document.createElement('canvas');
	var mosaicContext = mosaic.getContext('2d');
	var ctrack = new clm.tracker();

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
