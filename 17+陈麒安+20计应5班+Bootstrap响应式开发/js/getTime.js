//获取当前日期时间
function curentTime() {
	var now = new Date();

	var year = now.getFullYear(); //年
	var month = now.getMonth() + 1; //月
	var day = now.getDate(); //日

	var hh = now.getHours(); //时
	var mm = now.getMinutes(); //分
	var ss = now.getSeconds(); //分

	var clock = year + "年";

	if (month < 10)
		clock += "0";

	clock += month + "月";

	if (day < 10)
		clock += "0";

	clock += day + "日<br>";

	if (hh < 10)
		clock += "0";

	clock += hh + ":";
	if (mm < 10)
		clock += '0';
	clock += mm + ":";

	if (ss < 10)
		clock += '0';
	clock += ss;
	return clock;
}

//定时执行setTime
setInterval("setTime()", 1000);

//将id为currentTime的div更新为最新时间
function setTime() {
	$('#currentTime').html(curentTime());
}

/**
 *获取当前星期几
 *
 */
function getWeekDate() {
	var now = new Date();
	var day = now.getDay();
	var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
	var week = weeks[day];
	return week;
}
var show = document.getElementById("getWeek");
show.innerHTML = getWeekDate();
