class WindowManager 
{
	#windows;
	#count;
	#id;
	#winData;
	#winShapeChangeCallback;
	#winChangeCallback;
	#heartbeat;
	
	constructor ()
	{
		let that = this;

		// event listener for when localStorage is changed from another window
		addEventListener("storage", (event) => 
		{
			if (event.key == "windows")
			{
				let newWindows = JSON.parse(event.newValue || "[]");
				let winChange = that.#didWindowsChange(that.#windows, newWindows);

				that.#windows = newWindows;

				if (winChange)
				{
					if (that.#winChangeCallback) that.#winChangeCallback();
				}
			}
		});

		// event listener for when current window is about to ble closed
		window.addEventListener('beforeunload', function (e) 
		{
			// Read the latest shared list so closing one tab cannot remove newer tabs.
			let latestWindows = JSON.parse(localStorage.getItem("windows")) || [];
			latestWindows = latestWindows.filter((win) => win.id != that.#id);
			that.#windows = latestWindows;
			that.updateWindowsLocalStorage();
			if (that.#heartbeat) clearInterval(that.#heartbeat);
		});
	}

	// check if theres any changes to the window list
	#didWindowsChange (pWins, nWins)
	{
		if (pWins.length != nWins.length)
		{
			return true;
		}
		else
		{
			let c = false;

			for (let i = 0; i < pWins.length; i++)
			{
				if (pWins[i].id != nWins[i].id) c = true;
			}

			return c;
		}
	}

	// initiate current window (add metadata for custom data to store with each window instance)
	init (metaData)
	{
		let storedWindows = JSON.parse(localStorage.getItem("windows")) || [];
		let now = Date.now();
		this.#windows = storedWindows.filter((win) => win.lastSeen && now - win.lastSeen < 3000);
		this.#count= localStorage.getItem("count") || 0;
		this.#count++;

		this.#id = this.#count;
		let shape = this.getWinShape();
		this.#winData = {id: this.#id, shape: shape, metaData: metaData, lastSeen: now};
		this.#windows.push(this.#winData);

		localStorage.setItem("count", this.#count);
		this.updateWindowsLocalStorage();
		this.#heartbeat = setInterval(() => this.update(), 1000);
	}

	getWinShape ()
	{
		let shape = {x: window.screenLeft, y: window.screenTop, w: window.innerWidth, h: window.innerHeight};
		return shape;
	}

	getWindowIndexFromId (id)
	{
		let index = -1;

		for (let i = 0; i < this.#windows.length; i++)
		{
			if (this.#windows[i].id == id) index = i;
		}

		return index;
	}

	updateWindowsLocalStorage ()
	{
		let now = Date.now();
		let latestWindows = JSON.parse(localStorage.getItem("windows")) || [];
		let windowsById = new Map();
		latestWindows.forEach((win) => {
			if (win.lastSeen && now - win.lastSeen < 3000) windowsById.set(win.id, win);
		});
		let ownWindow = this.#windows.find((win) => win.id == this.#id);
		if (ownWindow) windowsById.set(ownWindow.id, ownWindow);
		this.#windows = Array.from(windowsById.values());
		localStorage.setItem("windows", JSON.stringify(this.#windows));
	}

	update ()
	{
		let winShape = this.getWinShape();
		let now = Date.now();
		let shapeChanged = winShape.x != this.#winData.shape.x ||
			winShape.y != this.#winData.shape.y ||
			winShape.w != this.#winData.shape.w ||
			winShape.h != this.#winData.shape.h;

		if (shapeChanged || now - this.#winData.lastSeen >= 1000)
		{
			this.#winData.shape = winShape;
			this.#winData.lastSeen = now;

			this.#windows = this.#windows.filter((win) => win.id == this.#id || now - win.lastSeen < 3000);
			let index = this.getWindowIndexFromId(this.#id);
			if (index < 0) return;
			this.#windows[index].shape = winShape;
			this.#windows[index].lastSeen = now;

			if (shapeChanged && this.#winShapeChangeCallback) this.#winShapeChangeCallback();
			this.updateWindowsLocalStorage();
		}
	}

	setWinShapeChangeCallback (callback)
	{
		this.#winShapeChangeCallback = callback;
	}

	setWinChangeCallback (callback)
	{
		this.#winChangeCallback = callback;
	}

	getWindows ()
	{
		return this.#windows;
	}

	getThisWindowData ()
	{
		return this.#winData;
	}

	getThisWindowID ()
	{
		return this.#id;
	}
}
