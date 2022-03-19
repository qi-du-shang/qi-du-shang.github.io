function txtSearch() {
	//遍历移除b标签，防止第二次搜索bug
	$(".changestyle").each(function() {
		var xx = $(this).html();
		$(this).replaceWith(xx);
	});
	//整个客户信息div
	var str = $(".content").html();
	//文本输入框
	var txt = $("#txtSearch").val();
	//不为空
	if ($.trim(txt) != "") {
		//定义b标签样式红色加粗
		var re = "<b class='changestyle'>" + txt + "</b>";
		//替换搜索相关的所有内容
		var nn = str.replace(new RegExp(txt, "gm"), re);
		//赋值
		//document.getElementById("divMain").innerHTML=nn;
		$(".content").html(nn);
		//显示搜索内容相关的div
		$(".contentBlock").hide().filter(":contains('" + txt + "')").show();
	} else {
		$(".contentBlock").show();
	}
}
