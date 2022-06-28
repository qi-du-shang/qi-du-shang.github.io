// 	document.getElementById('myInput').onkeydown = function keyup_submit(e){
	// 		//搜索框内容回车时，如果按钮的值为搜索文章或百度搜索则实行对应的功能
	// 		//回车事件
	// 	 var evt = window.event || e;

	// 	  if(document.getElementById("mySearch").value == "百度搜索"&&evt.keyCode == 13){
	// 		  //按钮值为百度搜索且为回车

	// 	window.location.href = "http://www.baidu.com/s?tn=monline_dg&bs=%E8%F3%B5%D9%B8%D4%B6%B9%B8%AF%B8%C9&f=8&wd=" +
	// 								document.getElementById("myInput").value;

	// 	  }

	// 	}



	document.getElementById('mySearch').onclick = function search() {
		//不执行回车事件时,点击按钮执行的搜索功能
		//点击事件
		if (document.getElementById("mySearch").value == "百度搜索") {
			window.location.href =
				"http://www.baidu.com/s?tn=monline_dg&bs=%E8%F3%B5%D9%B8%D4%B6%B9%B8%AF%B8%C9&f=8&wd=" +
				document.getElementById("myInput").value;
		}

	}

	document.getElementById('baidu').onclick = function change() {
		//搜索引擎切换函数,改变输入框的提示及按钮的文字
		document.getElementById("myInput").value = "百度搜索"
		document.getElementById("mySearch").value = "百度搜索"
	}
