'use strict';
const GAME_DURATION_MS = 10 * 60 * 1000;
// x、y 表示棋盘格坐标；w、h 表示棋子占用的格数。
const INITIAL = [
  {id:3,name:'张飞',art:'zhangfei',x:0,y:0,w:1,h:2},
  {id:1,name:'曹操',art:'caocao',x:1,y:0,w:2,h:2},
  {id:4,name:'赵云',art:'zhaoyun',x:3,y:0,w:1,h:2},
  {id:5,name:'马超',art:'machao',x:0,y:2,w:1,h:2},
  {id:2,name:'关羽',art:'guanyu',x:1,y:2,w:2,h:1},
  {id:6,name:'黄忠',art:'huangzhong',x:3,y:2,w:1,h:2},
  {id:7,name:'卒一',art:'soldier',x:1,y:3,w:1,h:1},
  {id:8,name:'卒二',art:'soldier',x:2,y:3,w:1,h:1},
  {id:9,name:'卒三',art:'soldier',x:0,y:4,w:1,h:1},
  {id:10,name:'卒四',art:'soldier',x:3,y:4,w:1,h:1},
];
const board = document.querySelector('#board');
const status = document.querySelector('#status');
const audio = document.querySelector('#bgm');
const voice = document.querySelector('#voice');
const effect = document.querySelector('#effect');
let soundEnabled = false;
let pieces, selected = null, showIds = false, moves = 0, ended = false, deadline;
let drag = null;

// 一个语音通道避免多人同时说话，事件音效使用单独通道。
function playEffect(name) {
  if (!soundEnabled) return;
  voice.pause();
  effect.src = `assets/audio/${name}.mp3`;
  effect.volume = .7;
  effect.play().catch(() => {});
}
function playVoice(piece) {
  if (!soundEnabled || !voice.paused || !effect.paused) return;
  const name = piece.art === 'soldier' ? 'zu' : piece.art;
  const count = name === 'caocao' ? 3 : 2;
  voice.src = `assets/audio/${name}${1 + Math.floor(Math.random()*count)}.mp3`;
  voice.volume = .7;
  voice.play().catch(() => {});
}

function canMove(piece, dx, dy) {
  const x = piece.x + dx, y = piece.y + dy;
  if (x < 0 || y < 0 || x + piece.w > 4 || y + piece.h > 5) return false;
  return pieces.every(other => other.id === piece.id ||
    x + piece.w <= other.x || x >= other.x + other.w ||
    y + piece.h <= other.y || y >= other.y + other.h);
}
function render() {
  for (const piece of pieces) {
    let button = board.querySelector(`[data-id="${piece.id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'piece'; button.dataset.id = piece.id;
      button.innerHTML = `<img src="assets/${piece.art}.png" alt="${piece.name}" draggable="false"><span class="id"></span>`;
      button.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0) return;
        // 接管棋盘拖动，阻止浏览器同时开始选择图片/文字。
        event.preventDefault();
        if (ended) return;
        selected = piece.id; render(); button.focus({preventScroll:true});
        drag = {id:piece.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
        button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('pointerup', event => {
        if (!drag || drag.id !== piece.id || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
        drag = null;
        if (Math.max(Math.abs(dx),Math.abs(dy)) < 12) return;
        move(piece.id, Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0, Math.abs(dy)>=Math.abs(dx)?Math.sign(dy):0);
      });
      button.addEventListener('pointercancel', () => {drag=null;});
      button.addEventListener('lostpointercapture', () => {drag=null;});
      button.addEventListener('focus', () => {selected=piece.id;render();});
      board.append(button);
    }
    // 棋子之间留 4px，与原截图的细白缝一致。
    Object.assign(button.style,{left:`${piece.x*25}%`,top:`${piece.y*20}%`,width:`calc(${piece.w*25}% - 4px)`,height:`calc(${piece.h*20}% - 4px)`});
    button.classList.toggle('selected', selected===piece.id);
    const label = button.querySelector('.id'); label.hidden=!showIds; label.textContent=piece.id;
    button.setAttribute('aria-label',`${piece.name}，角色ID ${piece.id}，第${piece.y+1}行第${piece.x+1}列`);
    button.setAttribute('aria-disabled',String(ended));
  }
}
function updateTimer() {
  if (ended) return;
  const seconds = Math.max(0, Math.ceil((deadline-Date.now())/1000));
  document.querySelector('#timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if (seconds===0) {ended=true;document.querySelector('.game').classList.add('expired');status.textContent='时间到！点击“重新开始”再挑战一次。';playEffect('fail');render();}
}
function move(id, dx, dy) {
  updateTimer(); if (ended) return false;
  const piece=pieces.find(item=>item.id===id);
  if (!piece || !canMove(piece,dx,dy)) {status.textContent='这个方向没有足够的空位，请换个方向。';return false;}
  piece.x+=dx;piece.y+=dy;moves++;
  if (piece.id===1 && piece.x===1 && piece.y===3) {
    ended=true;document.querySelector('.game').classList.add('finished');
    status.textContent=`恭喜通关！曹操到达出口，共移动 ${moves} 步。`;
    playEffect('win');
  } else {status.textContent=`已移动 ${moves} 步 · 将曹操移到底部出口。`;playVoice(piece);}
  render();return true;
}
function restart() {
  pieces=INITIAL.map(piece=>({...piece}));selected=null;moves=0;ended=false;drag=null;deadline=Date.now()+GAME_DURATION_MS;
  document.querySelector('.game').classList.remove('finished','expired');
  status.textContent='拖动棋子，或选中后按方向键，将曹操移到底部出口。';
  render();updateTimer();
  playEffect('start');
}
// 图片已设置 draggable=false；再阻止棋盘区域的原生拖放兜底。
board.addEventListener('dragstart', event => event.preventDefault());
document.querySelector('#restart').addEventListener('click',restart);
document.querySelector('#ids').addEventListener('click',event=>{
  showIds=!showIds;event.currentTarget.textContent=showIds?'隐藏角色ID':'显示角色ID';event.currentTarget.setAttribute('aria-pressed',String(showIds));render();
});
document.querySelector('#music').addEventListener('click',async()=>{
  const button=document.querySelector('#music');
  if (soundEnabled) {soundEnabled=false;audio.pause();voice.pause();effect.pause();button.firstChild.textContent='开启音乐 ';return;}
  try {audio.volume=.35;await audio.play();soundEnabled=true;button.firstChild.textContent='关闭音乐 ';playEffect('start');}
  catch {status.textContent='音乐暂时无法播放，请检查 assets/audio/background.mp3 是否存在。';}
});
document.addEventListener('keydown',event=>{
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if (selected!==null && directions[event.key] && event.target.classList.contains('piece')) {event.preventDefault();move(selected,...directions[event.key]);}
});
restart();setInterval(updateTimer,250);
