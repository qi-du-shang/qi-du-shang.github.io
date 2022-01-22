// 宠物养殖区
            var banners = ["images/01.png","images/02.png","images/03.png"]; // 图片地址
            var counter = 0;
            function run(){
                setInterval(cycle,270);  //重复运行cycle函数，周期100ms
            }
            function cycle(){
                counter++;
                if(counter == banners.length)    
                    counter = 0;
                document.getElementById("banner").src = banners[counter];
            }
//获取当前日期时间
    function curentTime()
    {
        var now = new Date();

        var year = now.getFullYear();       //年
        var month = now.getMonth() + 1;     //月
        var day = now.getDate();            //日

        var hh = now.getHours();            //时
        var mm = now.getMinutes();          //分
        var ss = now.getSeconds();          //分

        var clock = year + "年";

        if(month < 10)
            clock += "0";

        clock += month + "月";

        if(day < 10)
            clock += "0";

        clock += day + "日<br>";

        if(hh < 10)
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
    setInterval("setTime()",1000);

    //将id为currentTime的div更新为最新时间
    function setTime(){
        $('#currentTime').html(curentTime());
    }
	
// 一言api
fetch('https://v1.hitokoto.cn')
	  .then(function (res){
	    return res.json();
	  })
	  .then(function (data) {
	    var hitokoto = document.getElementById('hitokoto');
		  var from = document.getElementById('hitokotofrom');
		  var from_who = document.getElementById('hitokotofromwho');
	    hitokoto.innerText = data.hitokoto; 
		  from.innerText = data.from; 
		  from_who.innerText = data.from_who; 
	  })
	  .catch(function (err) {
	    console.error(err);
})
//ip地址
   window.onload = function getIp(){
        document.querySelector("#cip").innerHTML =returnCitySN['cip'];
        document.querySelector("#cname").innerHTML =returnCitySN['cname'];
    }
//ip地址板块删除功能
$(document).ready(function(){
  $("#btnDel0").click(function(){
    $("#petHome").fadeOut(2000);
  });
  $("#btnDel1").click(function(){
    $("#ipAddress").fadeOut(2000);
  });
  $("#btnDel2").click(function(){
    $("#oneSentence").fadeOut(2000);
  });
  $("#btnDel3").click(function(){
    $("#musicBar").fadeOut(2000);
  });
});
/* 鼠标点击文字特效 */
 var f_idx = 0;
 var c_idx = 0;
 jQuery(document).ready(function($) {
  $("body").click(function(e) {
   var font = new Array("富强", "民主", "文明", "和谐", "自由", "平等", "公正" ,"法治", "爱国", "敬业", "诚信", "友善");
 var color = new Array('#ff0000','#eb4310','#f6941d','#fbb417','#ffff00','#cdd541','#99cc33','#3f9337','#219167','#239676','#24998d','#1f9baa','#0080ff','#3366cc','#333399','#003366','#800080','#a1488e','#c71585','#bd2158');
   var $i = $("<span/>").text(font[f_idx]);
   f_idx = (f_idx + 1) % font.length;
 c_idx = (c_idx + 1) % color.length;
   var x = e.pageX,
    y = e.pageY;
   $i.css({
    "z-index": 99999999999999999999999999999999999999999999999999999999999999999999999999 ,
    "top": y - 20,
    "left": x,
    "position": "absolute",
    "font-weight": "bold",
    "color": color[c_idx]
   });
   $("body").append($i);
   $i.animate({
     "top": y - 180,
     "opacity": 0
    },
    1500,
    function() {
     $i.remove();
    });
  });
 });
// 音乐吧
var audioEl,
	titleEl,
	timeEl,
	rangeEl,
	playEl,
	volumeEl;
function initAudio(){
	var _audio;
	if(audioEl){ return; } //如果存在,说明已经初始化
	if(window['Audio'] && (_audio=new Audio()).canPlayType('audio/mpeg')){
		_audio.addEventListener('canplay',onCanPlay,false);
		_audio.addEventListener('play',onPlay,false);
		_audio.addEventListener('pause',onPause,false);
		_audio.addEventListener('ended',onEnded,false);
		_audio.addEventListener('error',onError,false);
		_audio.addEventListener('timeupdate',onTimeUpdate,false);
		_audio.volume=0.5;
		document.getElementById('container').appendChild(_audio);
		
		audioEl=_audio;
		titleEl=document.getElementById('title');
		timeEl=document.getElementById('time');
		rangeEl=document.getElementById('range');
		playEl=document.getElementById('play');
		volumeEl=document.getElementById('volume');
		
		volumeEl.addEventListener('change',onVolumeChange,false);
		rangeEl.addEventListener('change',onRangeChange,false);
		playEl.addEventListener('click',onPlayButtonClick,false);
	}else{
		alert('Oops, nice browser.');
		return;
	}
}
function loadAudio(url,title){
	if(!audioEl){ return; }
	var name=title || url.replace(/^.*\//,'').replace(/[#\?].*$/,'') || 'Unknown';
	titleEl.innerHTML=name;
	rangeEl.value=0;
	rangeEl.disabled=true;
	timeEl.innerHTML='--:-- / --:--';
	playEl.innerHTML='加载中';
	audioEl.autoplay=true;
	audioEl.src=url;
	//audioEl.load();
}
function onCanPlay(){
	rangeEl.disabled=false;
}
function onPlay(){
	playEl.innerHTML='暂停';
}
function onPause(){
	playEl.innerHTML='播放';
}
function onEnded(){
	audioEl.pause();
	audioEl.currentTime=0;
}
function onError(){
	rangeEl.disabled=true;
	titleEl.innerHTML='<span style="color:red">加载错误:'+titleEl.innerHTML+'</span>';
	playEl.innerHTML='已停止';
}
function onTimeUpdate(){
	var pos=audioEl.currentTime,
		dora=audioEl.duration;
	timeEl.innerHTML=formatTime(pos)+' / '+formatTime(dora);
	//console.info(pos,dora);
	if(isFinite(dora) && dora>0){
		rangeEl.value=pos/dora;
	}
}
function onVolumeChange(){
	if(!audioEl){ return; }
	audioEl.volume=volumeEl.value;
}
function onRangeChange(){
	if(!audioEl){ return; }
	var buf=audioEl.buffered.length?audioEl.buffered.end(0):0,
		dora=audioEl.duration;
	if(isFinite(dora) && dora>0){
		var value=rangeEl.value,
			pos=value*dora;
		if(pos>buf){
			pos=buf;
		}
		audioEl.currentTime=pos;
	}
}
function onPlayButtonClick(){
	if(!audioEl){ return; }
	if(audioEl.error){ //加载错误
		return;
	}else if(audioEl.readyState<2){ //还没可以播放
		audioEl.autoplay^=true; //切换是否autoplay
	}else if(audioEl.paused){
		audioEl.play();
	}else{
		audioEl.pause();
	}
}
function formatTime(sec){
	if(!isFinite(sec) || sec<0){
		return '--:--';
	}else{
		var m=Math.floor(sec/60),
			s=Math.floor(sec)%60;
		return (m<10?'0'+m:m)+':'+(s<10?'0'+s:s);
	}
}
initAudio();
loadAudio('musics/haikuotiankong.mp3','海阔天空 Beyond');