// Boot inicial: ativa página correta antes do primeiro paint, escolhe avatar do Max do dia,
// fecha dropdowns/menus em click fora.

// Ativar página correta antes do primeiro paint (evita flash da home)
document.addEventListener('DOMContentLoaded', function () {
  var h = location.hash.replace('#', '');
  if (!h) { try { h = sessionStorage.getItem('mc_page') || ''; } catch (e) { } }
  var id = h ? 'page-' + h : 'page-home';
  var target = document.getElementById(id);
  if (target) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    target.classList.add('active');
  }
}, false);

// Max avatar rotation — uma roupa por dia, ciclo determinístico (sem repetir até cobrir todo pool)
var MAX_DAILY_AVATARS = [
  'img/bot/Daily/max-bot-techbro-v2_1.png',
  'img/bot/Daily/max-bot-streetwear-v5_1.png',
  'img/bot/Daily/max-bot-techbro-v3_1.png',
  'img/bot/Daily/max-bot-summer-v2_1.png',
  'img/bot/Daily/max-bot-blazer_1.png',
  'img/bot/Daily/max-bot-golf_1.png',
  'img/bot/Daily/max-bot-varsity-v2_1.png',
  'img/bot/Daily/max-bot-varsity-v3_2.png',
  'img/bot/Daily/max-bot-hoodie-v4_2.png',
  'img/bot/Daily/max-bot-techbro-cap_2.png'
];
var MAX_PJ_AVATARS = [
  'img/bot/Pj/max-bot-hulk_1.png',
  'img/bot/Pj/max-bot-spidey_1.png',
  'img/bot/Pj/max-bot-prada_1.png',
  'img/bot/Pj/max-bot-gucci-v2_1.png',
  'img/bot/Pj/max-bot-lv-v2_1.png',
  'img/bot/Pj/max-bot-lacoste-v4_1.png',
  'img/bot/Pj/max-bot-hulk-pj_1.png',
  'img/bot/Pj/max-bot-hulk-tee_1.png',
  'img/bot/Pj/max-bot-spidey-suit-v3_1.png',
  'img/bot/Pj/max-bot-spidey-pj-cream-v5_2.png',
  'img/bot/Pj/max-bot-sulley-pj_1.png',
  'img/bot/Pj/max-bot-mike-pj_1.png'
];
function pickMaxAvatar() {
  var now = new Date();
  var day = now.getDay();
  var isWeekend = (day === 0 || day === 6);
  var pool = isWeekend ? MAX_PJ_AVATARS : MAX_DAILY_AVATARS;
  var year = now.getFullYear();
  var jan1 = new Date(year, 0, 1);
  var todayIdx = Math.floor((now - jan1) / 86400000);
  var count = 0;
  for (var i = 0; i <= todayIdx; i++) {
    var d = new Date(year, 0, 1 + i).getDay();
    var w = (d === 0 || d === 6);
    if (w === isWeekend) count++;
  }
  var pos = (count - 1) % pool.length;
  var cycleNum = Math.floor((count - 1) / pool.length);
  var idx = []; for (var i = 0; i < pool.length; i++) idx.push(i);
  var seed = ((year * 1000) + (cycleNum * 7) + (isWeekend ? 3 : 0)) >>> 0;
  for (var i = pool.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    var j = seed % (i + 1);
    var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return pool[idx[pos]];
}
document.addEventListener('DOMContentLoaded', function () {
  var src = pickMaxAvatar();
  var imgs = document.querySelectorAll('.bot-fab img, .bot-av img');
  for (var i = 0; i < imgs.length; i++) imgs[i].src = src;
}, false);

// Fechar dropdowns em click fora
document.addEventListener('click', function (e) {
  var lb = document.querySelector('.lang-btn.open');
  if (lb && !lb.contains(e.target)) lb.classList.remove('open');
  var um = document.getElementById('user-dd-menu');
  if (um && um.classList.contains('open') && !um.closest('.user-menu-btn').contains(e.target)) um.classList.remove('open');
}, false);
