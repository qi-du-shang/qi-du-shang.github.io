window.onload = function() {
 	var myDiv = document.getElementById("writeSomething");
 	var contentArr = "这是一个博客,您分享生活,技术,文章等内容的乐园。".split("");
 	var content = "";
 	var index = 0;
 	var ID = setInterval(function() {
 		content += contentArr[index];
 		myDiv.innerHTML = content + "_";
 		index++;
 		if (index === contentArr.length) {
 			myDiv.innerHTML = content;
 			clearInterval(ID);
 			console.log("结束了");
 		}
 	}, 300);
 }
