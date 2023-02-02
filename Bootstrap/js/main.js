//低版本jquery用的是$(window).load()函数，高版本用的是$(window).on()
//加载动画
//  $(window).on('load', function handlePreloader() {
// 	if ($('.preloader').length) {
// 		$('.preloader').delay(200).fadeOut(500);
// 	}
// });

//置顶按钮
let glyphiconChevronUp = document.querySelector('.glyphicon-chevron-up');
glyphiconChevronUp.onclick = function() {
	window.scrollTo(0, 0);
}
