const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let particleSystem;
let particlePositions;
let particleColors;
let particleSeeds;
let particlesPerWindow = 6000;
let particleCount = 0;
let windowMotion = {};
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
window.addEventListener("load", init);

	function init ()
	{
		if (initialized) return;
		initialized = true;
		setupScene();
		setupWindowManager();
		resize();
		updateWindowShape(false);
		render();
		window.addEventListener('resize', resize);
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = null;
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, alpha: true, depthBuffer: true});
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

	  	let particleTextureCanvas = document.createElement("canvas");
	  	particleTextureCanvas.width = 64;
	  	particleTextureCanvas.height = 64;
	  	let particleTextureContext = particleTextureCanvas.getContext("2d");
	  	let particleGradient = particleTextureContext.createRadialGradient(32, 32, 0, 32, 32, 32);
	  	particleGradient.addColorStop(0, "rgba(255,255,255,1)");
	  	particleGradient.addColorStop(.35, "rgba(255,255,255,.9)");
	  	particleGradient.addColorStop(1, "rgba(255,255,255,0)");
	  	particleTextureContext.fillStyle = particleGradient;
	  	particleTextureContext.fillRect(0, 0, 64, 64);
	  	let particleTexture = new t.CanvasTexture(particleTextureCanvas);

	  	particleSystem = new t.Points(
	  		new t.BufferGeometry(),
	  		new t.PointsMaterial({
	  			size: 2.6,
	  			map: particleTexture,
	  			alphaTest: .01,
	  			vertexColors: true,
	  			transparent: true,
	  			opacity: 0.88,
	  			blending: t.NormalBlending,
	  			depthWrite: false
	  		})
	  	);
	  	world.add(particleSystem);

	  	renderer.domElement.setAttribute("id", "scene");
	  	document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		updateNumberOfParticles();
	}

	function updateNumberOfParticles ()
	{
		let wins = windowManager.getWindows();
		particleCount = wins.length * particlesPerWindow;
		particlePositions = new Float32Array(particleCount * 3);
		particleColors = new Float32Array(particleCount * 3);
		particleSeeds = new Float32Array(particleCount);

		for (let i = 0; i < particleCount; i++)
		{
			// Deterministic seeds keep every browser window perfectly synchronized.
			particleSeeds[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
			if (particleSeeds[i] < 0) particleSeeds[i] += 1;
		}

		let geometry = particleSystem.geometry;
		geometry.setAttribute("position", new t.BufferAttribute(particlePositions, 3));
		geometry.setAttribute("color", new t.BufferAttribute(particleColors, 3));
		geometry.getAttribute("position").setUsage(t.DynamicDrawUsage);
		geometry.getAttribute("color").setUsage(t.DynamicDrawUsage);
	}

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let currentTime = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();
		let activeIds = {};
		wins.forEach((win) => {
			activeIds[win.id] = true;
			if (!windowMotion[win.id])
			{
				windowMotion[win.id] = {
					x: win.shape.x + win.shape.w * .5,
					y: win.shape.y + win.shape.h * .5,
					vx: 0,
					vy: 0,
					waveX: 0,
					waveY: 0
				};
			}
		});
		Object.keys(windowMotion).forEach((id) => {
			if (!activeIds[id]) delete windowMotion[id];
		});

		for (let windowIndex = 0; windowIndex < wins.length; windowIndex++)
		{
			let win = wins[windowIndex];
			let motion = windowMotion[win.id];
			let targetX = win.shape.x + win.shape.w * .5;
			let targetY = win.shape.y + win.shape.h * .5;
			motion.vx = motion.vx * .8 + (targetX - motion.x) * .2;
			motion.vy = motion.vy * .8 + (targetY - motion.y) * .2;
			motion.x += motion.vx;
			motion.y += motion.vy;
			motion.waveX = motion.waveX * .88 + motion.vx * .6;
			motion.waveY = motion.waveY * .88 + motion.vy * .6;
			let centerX = motion.x;
			let centerY = motion.y;
			let radius = Math.min(win.shape.w, win.shape.h) * .25;
			let windowHues = [.34, 0, .58, .82, .14, .72, .48, .08];
			let hue = windowHues[(Math.abs(Number(win.id)) - 1) % windowHues.length];
			let start = windowIndex * particlesPerWindow;

			for (let localIndex = 0; localIndex < particlesPerWindow; localIndex++)
			{
				let i = start + localIndex;
				let seed = particleSeeds[i];
				let latitude = Math.asin(-1 + 2 * ((localIndex + .5) / particlesPerWindow));
				let longitude = Math.PI * (3 - Math.sqrt(5)) * localIndex;
				let wave = Math.sin(currentTime * 1.5 + seed * 20 + longitude * 3) * 14;
				let shell = radius + wave + Math.sin(latitude * 9 + currentTime) * 7;
				let angle = longitude + currentTime * (.09 + seed * .015);
				let x = Math.cos(latitude) * Math.cos(angle) * shell;
				let y = Math.sin(latitude) * shell;
				let z = Math.cos(latitude) * Math.sin(angle) * shell;

				let siphonX = 0;
				let siphonY = 0;
				let streamColorMix = 0;
				if (wins.length > 1)
				{
					let other = null;
					let nearestDistance = Infinity;
					wins.forEach((candidate, candidateIndex) => {
						if (candidateIndex === windowIndex) return;
						let candidateX = candidate.shape.x + candidate.shape.w * .5;
						let candidateY = candidate.shape.y + candidate.shape.h * .5;
						let candidateDistance = Math.hypot(candidateX - centerX, candidateY - centerY);
						if (candidateDistance < nearestDistance) {
							nearestDistance = candidateDistance;
							other = candidate;
						}
					});
					let otherX = other.shape.x + other.shape.w * .5;
					let otherY = other.shape.y + other.shape.h * .5;
					let dx = otherX - centerX;
					let dy = otherY - centerY;
					let distance = Math.sqrt(dx * dx + dy * dy);
					let directionX = dx / Math.max(distance, 1);
					let directionY = dy / Math.max(distance, 1);
					let overlap = Math.max(0, 1 - distance / Math.max(radius * 2.4, 1));
					let tailIndex = Math.max(0, (seed - .7) / .3);
					let tailPosition = Math.pow(tailIndex, .65);
					let tailLength = Math.max(radius * 1.2, distance - radius * .65);
					let tailRadius = radius * (.28 + (1 - tailPosition) * .72) * (1 - overlap * .68);
					let tailWave = Math.sin(currentTime * 2.3 + seed * 50 + longitude * 3) * tailRadius * .42;
					let tailOffset = radius * .7 + tailPosition * tailLength;
					let tailX = directionX * tailOffset - directionY * tailWave;
					let tailY = directionY * tailOffset + directionX * tailWave;

					x = x * (1 - tailIndex) + tailX * tailIndex;
					y = y * (1 - tailIndex) + tailY * tailIndex;
					z *= 1 - tailIndex * .55;
					siphonX = directionX * (tailRadius + motion.waveX * .25) * Math.sin(seed * 80 + currentTime) * tailIndex;
					siphonY = directionY * (tailRadius + motion.waveY * .25) * Math.cos(seed * 70 + currentTime) * tailIndex;
					streamColorMix = tailIndex * (.35 + overlap * .65);
				}

				let turbulence = Math.sin(currentTime * .8 + seed * 31) * 12;
				let waterShake = Math.sin(seed * 37 + currentTime * 2.1) * (Math.abs(motion.vx) + Math.abs(motion.vy)) * .18;
				let index = i * 3;
				particlePositions[index] = centerX + x + siphonX + turbulence + waterShake + motion.waveX * (1 - seed) * .35;
				particlePositions[index + 1] = centerY + y + siphonY + turbulence * .4 + waterShake + motion.waveY * (1 - seed) * .35;
				particlePositions[index + 2] = z + Math.sin(currentTime + seed * 15) * 90;

				let brightness = .48 + .5 * Math.abs(Math.sin(longitude * 2 + currentTime * 2 + seed));
				let color = new t.Color().setHSL(hue, 1, .32 + brightness * .16);
				color.multiplyScalar(1.1 + streamColorMix * .35);
				particleColors[index] = color.r;
				particleColors[index + 1] = color.g;
				particleColors[index + 2] = color.b;
			}
		}

		particleSystem.geometry.getAttribute("position").needsUpdate = true;
		particleSystem.geometry.getAttribute("color").needsUpdate = true;

		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}


	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}