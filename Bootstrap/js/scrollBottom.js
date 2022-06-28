let scrollBottom = document.querySelector('.scrollBottom');
scrollBottom.onmouseover = function() {

	scroll = (ev, target) => {
		// ev.preventDefault();

		const scrollPart = document.querySelector('.backToBottom'); // 目标节点class
		const top = scrollPart.getBoundingClientRect().top;
		const pageY = window.pageYOffset;
		const endPosition = top + pageY;

		const startTime = +new Date();
		const duration = 3000; //ms

		function run() {
			const time = +new Date() - startTime;

			window.scrollTo(0, pageY + top * (time / duration));
			run.timer = requestAnimationFrame(run);

			if (time >= duration) {
				window.scrollTo(0, endPosition);
				cancelAnimationFrame(run.timer);
			}
		}

		requestAnimationFrame(run);
	}

	scroll();

}
