(function () {
    const layer = document.getElementById("background-layer");
    const toggle = document.getElementById("background-toggle");
    const options = toggle.querySelectorAll("[data-background-option]");
    const modes = ["rain", "quantum"];
    let mode = localStorage.getItem("roco-background") || "rain";
    let stopCurrent = function () {};
    function clearCanvas() {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
    }

    function startRain() {
        const THREE = window.THREE;
        let renderer;
        let animationFrame;
        const lightning = document.createElement("div");
        lightning.setAttribute("aria-hidden", "true");
        lightning.style.cssText = "position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(circle at 72% 25%,rgba(30,120,255,.52),rgba(0,35,150,.16) 34%,transparent 70%);mix-blend-mode:screen;transition:opacity .08s ease-out;";
        document.body.appendChild(lightning);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
        camera.position.set(0, 0, 1);
        camera.rotation.set(1.16, -0.12, 0.27);
        scene.add(new THREE.AmbientLight(0x555555));
        const directionalLight = new THREE.DirectionalLight(0xffeedd);
        directionalLight.position.set(0, 0, 1);
        scene.add(directionalLight);
        const flash = new THREE.PointLight(0x062d89, 30, 500, 1.7);
        flash.position.set(200, 300, 100);
        scene.add(flash);
        scene.fog = new THREE.FogExp2(0x11111f, 0.002);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setClearColor(0xfff8e8, 0);
        layer.appendChild(renderer.domElement);
        const clouds = [];
        const cloudGeometry = new THREE.PlaneBufferGeometry(500, 500);
        const textureCanvas = document.createElement("canvas");
        textureCanvas.width = 64;
        textureCanvas.height = 64;
        const textureContext = textureCanvas.getContext("2d");
        const gradient = textureContext.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255,255,255,.9)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        textureContext.fillStyle = gradient;
        textureContext.fillRect(0, 0, 64, 64);
        const cloudMaterial = new THREE.MeshLambertMaterial({
            map: new THREE.CanvasTexture(textureCanvas),
            transparent: true
        });
        for (let i = 0; i < 25; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.userData = {
                baseX: Math.random() * 800 - 400,
                baseY: 500 + Math.random() * 180 - 90,
                baseZ: Math.random() * 500 - 450,
                phase: Math.random() * Math.PI * 2,
                drift: 8 + Math.random() * 14,
                bob: 3 + Math.random() * 7,
                rotationSpeed: 0.0008 + Math.random() * 0.0012
            };
            cloud.position.set(cloud.userData.baseX, cloud.userData.baseY, cloud.userData.baseZ);
            cloud.rotation.set(1.16, -0.12, Math.random() * 360);
            cloud.material.opacity = 0.6;
            clouds.push(cloud);
            scene.add(cloud);
        }
        function resize() {
            camera.aspect = innerWidth / innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(innerWidth, innerHeight);
        }
        function animate() {
            const time = performance.now() * 0.001;
            clouds.forEach(function (cloud) {
                const data = cloud.userData;
                cloud.position.x = data.baseX + Math.sin(time * 0.08 + data.phase) * data.drift;
                cloud.position.y = data.baseY + Math.sin(time * 0.16 + data.phase) * data.bob;
                cloud.rotation.z -= data.rotationSpeed;
            });
            if (Math.random() > 0.93 || flash.power > 100) {
                if (flash.power < 100) flash.position.set(Math.random() * 400, 300 + Math.random() * 200, 100);
                flash.power = 50 + Math.random() * 500;
                lightning.style.opacity = String(Math.min(0.82, flash.power / 700));
            } else {
                lightning.style.opacity = "0";
            }
            renderer.render(scene, camera);
            animationFrame = requestAnimationFrame(animate);
        }
        addEventListener("resize", resize);
        resize();
        animate();
        return function () {
            cancelAnimationFrame(animationFrame);
            removeEventListener("resize", resize);
            renderer.dispose();
            lightning.remove();
            clearCanvas();
        };
    }

    function startQuantum() {
        const frame = document.createElement("iframe");
        frame.src = "quantum-background.html";
        frame.title = "量子纠缠背景";
        frame.setAttribute("aria-hidden", "true");
        frame.tabIndex = -1;
        frame.style.cssText = "display:block;width:100%;height:100%;border:0;pointer-events:none;background:transparent;";
        layer.appendChild(frame);
        return function () {
            frame.src = "about:blank";
            frame.remove();
            clearCanvas();
        };
    }

    function applyMode() {
        stopCurrent();
        clearCanvas();
        if (!window.THREE) {
            console.error("Three.js 尚未加载，无法初始化背景");
            return;
        }
        stopCurrent = mode === "rain" ? startRain() : startQuantum();
        toggle.dataset.mode = mode;
        options.forEach(function (option) {
            option.classList.toggle("active", option.dataset.backgroundOption === mode);
        });
        localStorage.setItem("roco-background", mode);
    }

    toggle.addEventListener("click", function () {
        mode = modes[(modes.indexOf(mode) + 1) % modes.length];
        applyMode();
    });
    document.body.classList.add("backgrounds-enabled");
    applyMode();
})();
