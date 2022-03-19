$(function(){ 
 var winHeight = $(document).scrollTop();
  
 $(window).scroll(function() {
  var scrollY = $(document).scrollTop();// 获取垂直滚动的距离，即滚动了多少
  
  if (scrollY > 100){ //如果滚动距离大于550px则隐藏，否则删除隐藏类
   $('.footer').addClass('hiddened');
  } 
  else {
   $('.footer').removeClass('hiddened');
  }
  
  if (scrollY > winHeight){ //如果没滚动到顶部，删除显示类，否则添加显示类
   $('.footer').removeClass('showed');
  } 
  else {
   $('.footer').addClass('hiddened');
  }    
  
  if (scrollY == 0){
	  $('.footer').removeClass('hiddened');
  }
  
  });
});