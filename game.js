(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#gameCanvas'), ctx=canvas.getContext('2d');
const screens={menu:$('#menuScreen'),game:$('#gameScreen'),ending:$('#endingScreen')};
const audio=$('#soundtrack'); audio.volume=.34;
const W=2200,H=1250,VW=1280,VH=720;
const keys=Object.create(null); let raf=0,last=0,toastTimer=0,chapterTimer=0,paused=false,dialogState=null,puzzleState=null;
const photoImgs=['assets/momento-1.jpg','assets/momento-2.jpg','assets/momento-3.jpg'].map(src=>{const i=new Image();i.src=src;return i});
const defaultState=()=>({version:3,chapter:0,x:180,y:870,dir:'down',memories:[],flags:{},choices:{},finished:false,playSeconds:0,music:false});
let state=defaultState(); let chapterSnapshot=null;

const MEMORIES=[
 {id:'date',title:'O começo',caption:'04.01.2026 — não como promessa de perfeição, mas como o começo de algo real.'},
 {id:'distance',title:'Mesmo longe',caption:'A distância aparece nos quilômetros, nos horários e até nos silêncios.'},
 {id:'photo1',title:'Um momento nosso',photo:0,caption:'Alguns momentos não precisam ser grandiosos para merecer ficar.'},
 {id:'photo2',title:'Outro pedaço',photo:1,caption:'Uma lembrança pequena também pode carregar uma história inteira.'},
 {id:'photo3',title:'Guardado aqui',photo:2,caption:'Nem toda fotografia mostra tudo o que estava sendo sentido naquele dia.'},
 {id:'laugh',title:'O que ainda faz rir',caption:'Mesmo em semanas difíceis, às vezes uma coisa boba consegue abrir uma fresta.'},
 {id:'truth',title:'Sinceridade',caption:'Olhar para o que doeu sem fingir que nunca aconteceu.'},
 {id:'space',title:'Espaço',caption:'Ficar também pode significar respeitar quando o outro precisa respirar.'},
 {id:'listen',title:'Escutar',caption:'Nem toda conversa difícil pede uma resposta imediata.'},
 {id:'bridge',title:'Reconstrução',caption:'Confiança não volta inteira. Ela é construída de novo, em atitudes.'},
 {id:'home',title:'Nosso lugar',caption:'Não um lugar perfeito. Um lugar onde ainda existe escolha e cuidado.'},
 {id:'continue',title:'Continua',caption:'Algumas histórias terminam. Outras chegam a uma página que ainda está sendo escrita.'}
];

const rect=(x,y,w,h)=>({x,y,w,h});
const chapters=[
 {name:'Prólogo',title:'O Caminho',subtitle:'Toda jornada começa quando você decide dar o primeiro passo.',spawn:[180,870],palette:['#10131b','#24202a','#3b313c'],objective:'Siga as pequenas luzes até a primeira lembrança.',
  obstacles:[rect(0,0,W,110),rect(0,1120,W,130),rect(0,0,90,H),rect(2110,0,90,H),rect(510,230,240,150),rect(1180,710,280,160)],
  objects:[{id:'p0a',x:520,y:840,t:'spark'},{id:'p0b',x:900,y:690,t:'spark'},{id:'p0c',x:1260,y:530,t:'spark'},{id:'date',x:1750,y:330,t:'memory',memory:'date',label:'Uma luz antiga'}],
  npcs:[{id:'guide0',x:360,y:890,name:'Voz',lines:['Você não precisa correr.','Algumas coisas só aparecem quando a gente chega perto o bastante para enxergar.']}],
  gate:{x:1940,y:260,requires:()=>hasMem('date'),hint:'Encontre a lembrança antes de seguir.'}},
 {name:'Capítulo I',title:'A Distância',subtitle:'Nem toda distância se mede em quilômetros.',spawn:[160,920],palette:['#0d1721','#162b38','#2a3942'],objective:'Acenda três sinais para criar um caminho até o outro lado.',
  obstacles:[rect(0,0,W,95),rect(0,1155,W,95),rect(0,0,75,H),rect(2125,0,75,H),rect(880,95,280,770),rect(880,1030,280,125)],
  objects:[{id:'sig1',x:390,y:790,t:'signal'},{id:'sig2',x:620,y:450,t:'signal'},{id:'sig3',x:1510,y:900,t:'signal'},{id:'distance',x:1780,y:430,t:'memory',memory:'distance',label:'Saudade'}],
  npcs:[{id:'phone',x:340,y:1010,name:'Mensagem',lines:['Tem dias em que a conversa é curta.','Tem dias em que o cansaço chega antes da gente.','Ainda assim, uma mensagem pode ser uma pequena ponte.']}],
  gate:{x:1970,y:310,requires:()=>countFlag('signal')>=3&&hasMem('distance'),hint:'Ainda faltam sinais ou uma lembrança deste lugar.'}},
 {name:'Capítulo II',title:'Jardim das Memórias',subtitle:'O que foi vivido não precisa ser perfeito para merecer ser lembrado.',spawn:[180,940],palette:['#142019','#223129','#4b4a3d'],objective:'Encontre três fotografias e organize as lembranças na ordem certa.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H),rect(500,340,180,340),rect(1030,180,220,260),rect(1510,620,250,270)],
  objects:[{id:'photo1',x:340,y:420,t:'photo',memory:'photo1',photo:0,label:'Fotografia'},{id:'photo2',x:900,y:930,t:'photo',memory:'photo2',photo:1,label:'Fotografia'},{id:'photo3',x:1790,y:340,t:'photo',memory:'photo3',photo:2,label:'Fotografia'},{id:'laugh',x:1840,y:970,t:'memory',memory:'laugh',label:'Uma risada esquecida'},{id:'gardenPuzzle',x:1340,y:500,t:'puzzle',puzzle:'memoryOrder',label:'Mesa de lembranças'}],
  npcs:[{id:'gardener',x:750,y:290,name:'Jardineira',lines:['Memórias não ficam organizadas sozinhas.','Algumas a gente guarda porque foram lindas. Outras porque ensinaram alguma coisa.']}],
  gate:{x:1990,y:1030,requires:()=>['photo1','photo2','photo3'].every(hasMem)&&state.flags.memoryOrderSolved,hint:'As fotografias ainda precisam ser encontradas e organizadas.'}},
 {name:'Capítulo III',title:'Ecos do Passado',subtitle:'Algumas portas podem ser abertas. Outras podem esperar.',spawn:[170,900],palette:['#17131b','#28202b','#3b303b'],objective:'Atravesse o corredor de ecos no seu próprio ritmo.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H),rect(620,90,130,680),rect(1030,480,140,680),rect(1490,90,150,650)],
  objects:[{id:'echoA',x:470,y:570,t:'echo',label:'Eco'},{id:'echoB',x:900,y:930,t:'echo',label:'Eco'},{id:'echoC',x:1360,y:350,t:'echo',label:'Eco'},{id:'truth',x:1840,y:620,t:'memory',memory:'truth',label:'Sinceridade'},{id:'space',x:1900,y:900,t:'memory',memory:'space',label:'Espaço'}],
  npcs:[{id:'shadow',x:330,y:1020,name:'Voz',lines:['O passado não deixa de existir porque a gente prefere não olhar.','Mas olhar também não precisa significar reviver tudo de uma vez.']}],
  gate:{x:2010,y:260,requires:()=>state.flags.echoChoice&&hasMem('truth')&&hasMem('space'),hint:'Existe uma escolha e duas lembranças antes da saída.'}},
 {name:'Capítulo IV',title:'A Tempestade',subtitle:'Em uma conversa difícil, vencer não é derrotar a outra pessoa.',spawn:[170,930],palette:['#10151d','#20242d','#3d3b46'],objective:'Encontre abrigo e atravesse três conversas sem transformar dor em disputa.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H),rect(430,250,260,180),rect(930,760,300,190),rect(1540,260,300,180)],
  objects:[{id:'storm1',x:530,y:540,t:'conversation',step:1,label:'Conversa I'},{id:'storm2',x:1080,y:610,t:'conversation',step:2,label:'Conversa II'},{id:'storm3',x:1690,y:560,t:'conversation',step:3,label:'Conversa III'},{id:'listen',x:1860,y:940,t:'memory',memory:'listen',label:'Escutar'}],
  npcs:[],gate:{x:2010,y:1010,requires:()=>countFlag('storm')>=3&&hasMem('listen'),hint:'Ainda existe uma conversa difícil para atravessar.'}},
 {name:'Capítulo V',title:'A Ponte',subtitle:'Reconstruir não é fingir que nunca quebrou.',spawn:[170,940],palette:['#15191d','#25272a','#433d3e'],objective:'Encontre três partes da ponte e coloque-as na ordem que faz sentido.',
  obstacles:[rect(0,0,W,95),rect(0,1155,W,95),rect(0,0,75,H),rect(2125,0,75,H),rect(890,95,360,940)],
  objects:[{id:'pieceA',x:350,y:400,t:'piece',piece:'responsabilidade',label:'Responsabilidade'},{id:'pieceB',x:620,y:930,t:'piece',piece:'tempo',label:'Tempo'},{id:'pieceC',x:1600,y:880,t:'piece',piece:'atitude',label:'Atitudes'},{id:'bridgePuzzle',x:1740,y:390,t:'puzzle',puzzle:'bridge',label:'Ponte incompleta'},{id:'bridge',x:1940,y:970,t:'memory',memory:'bridge',label:'Reconstrução'}],npcs:[{id:'builder',x:470,y:1010,name:'Construtora',lines:['Uma ponte remendada não volta a ser a mesma.','Mas isso não significa que ela não possa ficar forte de novo.']}],
  gate:{x:2030,y:260,requires:()=>state.flags.bridgeSolved&&hasMem('bridge'),hint:'A ponte ainda precisa ser reconstruída.'}},
 {name:'Capítulo VI',title:'Dias Comuns',subtitle:'Nem todo capítulo precisa doer para ser importante.',spawn:[180,900],palette:['#1a1b1f','#2d282a','#5a4a43'],objective:'Ajude as pessoas deste lugar e encontre beleza nas coisas pequenas.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H),rect(520,260,320,230),rect(1120,620,360,260),rect(1680,250,270,220)],
  objects:[{id:'tea',x:400,y:1010,t:'task',task:'tea',label:'Uma bebida quente'},{id:'flower',x:980,y:330,t:'task',task:'flower',label:'Uma flor'},{id:'meme',x:1570,y:950,t:'task',task:'meme',label:'Uma coisa boba'},{id:'quiet',x:1860,y:640,t:'task',task:'quiet',label:'Um banco silencioso'}],
  npcs:[{id:'npcA',x:370,y:820,name:'Moradora',lines:['Nem sempre precisa existir uma grande solução.','Às vezes companhia é só lembrar de uma bebida, uma flor, uma piada ruim.']}],
  gate:{x:2020,y:1020,requires:()=>countFlag('task')>=4,hint:'Ainda existem pequenas coisas para viver neste lugar.'}},
 {name:'Capítulo VII',title:'A Casa',subtitle:'Um lugar feito de lembranças, não de certezas.',spawn:[180,930],palette:['#17151a','#2a2228','#4f3b42'],objective:'Encontre as três chaves simbólicas e entre na casa.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H),rect(720,270,760,600)],
  objects:[{id:'key1',x:360,y:390,t:'key',key:'cuidado',label:'Cuidado'},{id:'key2',x:560,y:1010,t:'key',key:'respeito',label:'Respeito'},{id:'key3',x:1730,y:950,t:'key',key:'verdade',label:'Verdade'},{id:'door',x:1100,y:900,t:'door',label:'Porta da casa'}],
  npcs:[],gate:null},
 {name:'Capítulo VIII',title:'Por Dentro',subtitle:'Alguns lugares só revelam o que significam depois que você entra.',spawn:[210,920],palette:['#151317','#292227','#5b4b46'],objective:'Explore a casa e encontre aquilo que vocês ainda escolhem guardar.',interior:true,
  obstacles:[rect(0,0,W,100),rect(0,1150,W,100),rect(0,0,90,H),rect(2110,0,90,H),rect(720,100,80,520),rect(1410,650,80,500),rect(800,520,610,80)],
  objects:[{id:'home',x:410,y:350,t:'memory',memory:'home',label:'Nosso lugar'},{id:'desk',x:1120,y:320,t:'desk',label:'Uma mesa'},{id:'window',x:1750,y:390,t:'window',label:'Janela'},{id:'continue',x:1810,y:930,t:'memory',memory:'continue',label:'Uma página em branco'}],
  npcs:[{id:'you',x:1040,y:900,name:'Rafihx',lines:['Eu não queria te esperar aqui com uma resposta pronta.','Só queria que este lugar dissesse uma coisa melhor do que “vai ficar tudo bem”.','Que eu quero aprender a fazer melhor enquanto isso ainda fizer sentido para nós dois.']}],
  gate:{x:2020,y:1030,requires:()=>hasMem('home')&&hasMem('continue')&&state.flags.deskRead&&state.flags.windowSeen,hint:'Ainda existem coisas dentro da casa para encontrar.'}},
 {name:'Capítulo IX',title:'O Último Caminho',subtitle:'Não é um final. É só o ponto até onde chegamos hoje.',spawn:[180,900],palette:['#0f1116','#201b22','#42343b'],objective:'Caminhe até a última luz. Não há mais nada para provar.',
  obstacles:[rect(0,0,W,90),rect(0,1160,W,90),rect(0,0,80,H),rect(2120,0,80,H)],
  objects:[{id:'lastLight',x:1870,y:430,t:'final',label:'04.01.2026'}],
  npcs:[],gate:null}
];

function hasMem(id){return state.memories.includes(id)}
function countFlag(prefix){return Object.keys(state.flags).filter(k=>k.startsWith(prefix)&&state.flags[k]).length}
function addMem(id){if(hasMem(id))return;state.memories.push(id);const m=MEMORIES.find(x=>x.id===id);toast(`Memória encontrada: ${m?.title||id}`);save();hud();}
function save(){try{localStorage.setItem('entreNosFullSave',JSON.stringify(state))}catch(e){}}
function load(){try{const raw=localStorage.getItem('entreNosFullSave');if(!raw)return false;const s=JSON.parse(raw);if(!s||!Number.isInteger(s.chapter))return false;state={...defaultState(),...s,flags:{...(s.flags||{})},choices:{...(s.choices||{})},memories:Array.isArray(s.memories)?s.memories:[]};state.chapter=Math.max(0,Math.min(chapters.length-1,state.chapter));return true}catch(e){return false}}
function showScreen(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active')}
function current(){return chapters[state.chapter]}
function progress(){const chapterPart=(state.chapter/(chapters.length-1))*82;const memoryPart=(state.memories.length/MEMORIES.length)*18;return Math.min(99,Math.round(chapterPart+memoryPart))}
function hud(){const c=current();$('#chapterLabel').textContent=`${c.name} — ${c.title}`;$('#memoryLabel').textContent=`✦ ${state.memories.length}/${MEMORIES.length}`;$('#progressLabel').textContent=(state.finished?100:progress())+'%';$('#objectiveText').textContent=c.objective}
function toast(msg){clearTimeout(toastTimer);const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');toastTimer=setTimeout(()=>el.classList.add('hidden'),2600)}
function updateContinue(){const has=load();$('#continueBtn').classList.toggle('hidden',!has||state.finished)}

function resetWorldObjects(){for(const c of chapters)for(const o of c.objects||[])delete o.runtimeDone}
function newGame(){state=defaultState();resetWorldObjects();enterChapter(0,true);}
function continueGame(){load();enterChapter(state.chapter,false);}
function enterChapter(index,fresh=true){state.chapter=index;const c=current();if(fresh){state.x=c.spawn[0];state.y=c.spawn[1]}state.x=Math.max(110,Math.min(W-110,state.x));state.y=Math.max(120,Math.min(H-120,state.y));paused=false;showScreen('game');hud();chapterSnapshot=JSON.parse(JSON.stringify(state));save();showChapterCard();cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(loop);}
function showChapterCard(){const c=current();$('#chapterNum').textContent=c.name.toUpperCase();$('#chapterTitle').textContent=c.title;$('#chapterSubtitle').textContent=c.subtitle;$('#chapterCard').classList.remove('hidden');clearTimeout(chapterTimer);chapterTimer=setTimeout(()=>$('#chapterCard').classList.add('hidden'),2600)}
function nextChapter(){if(state.chapter>=chapters.length-1)return finishGame();state.chapter++;const c=current();state.x=c.spawn[0];state.y=c.spawn[1];save();hud();chapterSnapshot=JSON.parse(JSON.stringify(state));showChapterCard();}

function isBlocking(x,y){const p={x:x-17,y:y-20,w:34,h:40};for(const r of current().obstacles||[])if(p.x<r.x+r.w&&p.x+p.w>r.x&&p.y<r.y+r.h&&p.y+p.h>r.y)return true;return false}
function move(dx,dy,dt){const speed=260;let nx=state.x+dx*speed*dt,ny=state.y+dy*speed*dt;if(!isBlocking(nx,state.y))state.x=Math.max(30,Math.min(W-30,nx));if(!isBlocking(state.x,ny))state.y=Math.max(30,Math.min(H-30,ny));if(Math.abs(dx)>Math.abs(dy))state.dir=dx>0?'right':'left';else if(dy)state.dir=dy>0?'down':'up'}
function camera(){return{x:Math.max(0,Math.min(W-VW,state.x-VW/2)),y:Math.max(0,Math.min(H-VH,state.y-VH/2))}}
function isCompleted(o){if(o.runtimeDone)return true;if(o.t==='memory'||o.t==='photo')return !!o.memory&&hasMem(o.memory);if(o.t==='signal')return !!state.flags['signal_'+o.id];if(o.t==='echo')return !!state.flags['echo_'+o.id];if(o.t==='conversation')return !!state.flags['storm_'+o.step];if(o.t==='piece')return !!state.flags['piece_'+o.piece];if(o.t==='task')return !!state.flags['task_'+o.task];if(o.t==='key')return !!state.flags['key_'+o.key];if(o.t==='desk')return !!state.flags.deskRead;if(o.t==='window')return !!state.flags.windowSeen;if(o.t==='puzzle'&&o.puzzle==='memoryOrder')return !!state.flags.memoryOrderSolved;if(o.t==='puzzle'&&o.puzzle==='bridge')return !!state.flags.bridgeSolved;return false}
function nearInteractive(){let best=null,dist=1e9;const things=[...(current().objects||[]),...(current().npcs||[])];if(current().gate)things.push({...current().gate,id:'__gate',t:'gate'});for(const o of things){if(isCompleted(o))continue;const d=Math.hypot(state.x-o.x,state.y-o.y);if(d<dist){dist=d;best=o}}return dist<105?best:null}
function interact(){if(paused||dialogState||puzzleState)return;const o=nearInteractive();if(!o)return;if(current().npcs?.includes(o))return npcInteract(o);switch(o.t){case'spark':o.runtimeDone=true;toast('A luz respondeu ao seu passo.');break;case'memory':memoryInteract(o);break;case'photo':photoInteract(o);break;case'signal':signalInteract(o);break;case'puzzle':openPuzzle(o.puzzle,o);break;case'echo':echoInteract(o);break;case'conversation':conversationInteract(o);break;case'piece':pieceInteract(o);break;case'task':taskInteract(o);break;case'key':keyInteract(o);break;case'door':doorInteract(o);break;case'desk':deskInteract(o);break;case'window':windowInteract(o);break;case'final':finalInteract(o);break;case'gate':gateInteract();break;}save();hud();}
function npcInteract(o){dialog(o.name,o.lines,()=>{state.flags['npc_'+state.chapter+'_'+o.id]=true;save()})}
function memoryInteract(o){if(hasMem(o.memory)){o.runtimeDone=true;return}const m=MEMORIES.find(x=>x.id===o.memory);dialog('Lembrança',[m.caption],()=>{addMem(o.memory);o.runtimeDone=true})}
function photoInteract(o){if(!hasMem(o.memory)){addMem(o.memory)}o.runtimeDone=true;const m=MEMORIES.find(x=>x.id===o.memory);$('#photoView').src=`assets/momento-${o.photo+1}.jpg`;$('#photoCaption').textContent=m.caption;$('#photoModal').classList.remove('hidden');paused=true}
function signalInteract(o){if(state.flags['signal_'+o.id])return;state.flags['signal_'+o.id]=true;o.runtimeDone=true;toast(`Sinal aceso • ${countFlag('signal')}/3`);if(countFlag('signal')===3)dialog('Voz',['As três luzes não encurtaram a distância.','Só mostraram onde colocar os próximos passos.'])}
function gateInteract(){const g=current().gate;if(!g)return;if(g.requires())nextChapter();else dialog('Caminho',[g.hint])}
function echoInteract(o){if(state.flags['echo_'+o.id]){o.runtimeDone=true;return}dialog('Eco',['Uma lembrança antiga bate na porta.','Você pode olhar para ela agora ou reconhecer que ainda não é a hora.'],null,[
 {text:'Olhar com calma, sem fingir que não dói.',value:'face'},
 {text:'Ainda não. Quero continuar no meu tempo.',value:'space'}
],value=>{state.flags['echo_'+o.id]=true;state.choices[o.id]=value;o.runtimeDone=true;if(!state.flags.echoChoice){state.flags.echoChoice=true;dialog('Voz',['Nenhuma das duas escolhas apaga o passado.','A diferença é que aqui você pôde escolher como chegar perto dele.'])}})}
function conversationInteract(o){const key='storm_'+o.step;if(state.flags[key]){o.runtimeDone=true;return}const prompts={1:['A outra pessoa está ferida e você também quer explicar o seu lado. O que vem primeiro?',[['Escutar até o fim antes de me defender.','listen'],['Provar que eu também tenho razão.','defend'],['Encerrar tudo imediatamente.','close']]],2:['Você percebe que a conversa ficou pesada demais. O que pode ser cuidado agora?',[['Dar espaço sem usar silêncio como punição.','space'],['Continuar insistindo até resolver hoje.','push'],['Fingir que nada aconteceu.','ignore']]],3:['Você errou e gostaria que tudo voltasse ao normal. O que faz sentido?',[['Reconhecer o erro sem transformar desculpa em cobrança por perdão.','own'],['Pedir que esqueça porque já passou.','erase'],['Dizer que o tempo sozinho resolve.','time']]]};
 const [q,opts]=prompts[o.step];dialog('Tempestade',[q],null,opts.map(([text,value])=>({text,value})),value=>{state.flags[key]=true;state.choices[key]=value;o.runtimeDone=true;const healthy=['listen','space','own'].includes(value);dialog('Voz',[healthy?'Essa escolha não conserta tudo. Mas evita transformar a dor em uma disputa.':'Nem toda reação ajuda só porque nasceu de um momento difícil. Perceber isso também faz parte do caminho.'])})}
function pieceInteract(o){const key='piece_'+o.piece;if(state.flags[key])return;state.flags[key]=true;o.runtimeDone=true;toast(`${o.label} encontrada • ${countFlag('piece')}/3`)}
function taskInteract(o){const key='task_'+o.task;if(state.flags[key])return;const lines={tea:['Uma bebida quente. Nada grandioso. Só cuidado em forma pequena.'],flower:['Uma flor encontrada no caminho. Não resolve um dia ruim, mas pode deixá-lo um pouco menos cinza.'],meme:['Uma coisa completamente boba. Às vezes rir por alguns segundos já muda o peso de uma noite.'],quiet:['Vocês sentam sem precisar preencher todo o silêncio. Companhia também pode ser isso.']};dialog('Momento comum',lines[o.task],()=>{state.flags[key]=true;o.runtimeDone=true;toast(`Momento vivido • ${countFlag('task')}/4`)})}
function keyInteract(o){const key='key_'+o.key;if(state.flags[key])return;state.flags[key]=true;o.runtimeDone=true;toast(`Chave encontrada: ${o.label} • ${countFlag('key')}/3`)}
function doorInteract(o){if(countFlag('key')<3)return dialog('Porta',['A casa não abre com uma única coisa.','Ainda faltam chaves pelo caminho.']);o.runtimeDone=true;dialog('Porta',['Cuidado. Respeito. Verdade.','Nenhuma delas garante que tudo será fácil. Juntas, elas abrem espaço para entrar.'],()=>nextChapter())}
function deskInteract(o){state.flags.deskRead=true;o.runtimeDone=true;dialog('Na mesa',['Há uma folha sem respostas prontas.','Nela está escrito: “Eu não posso mudar o que já aconteceu. Posso escolher melhor o que faço daqui para frente.”'])}
function windowInteract(o){state.flags.windowSeen=true;o.runtimeDone=true;dialog('Janela',['Do lado de fora, o caminho inteiro parece menor do que parecia quando você estava atravessando.','Talvez seja assim com algumas fases da vida.'])}
function finalInteract(o){o.runtimeDone=true;dialog('Última luz',['Você chegou até aqui.','Não existe pergunta final. Não existe escolha certa escondida.','Só o que foi vivido e aquilo que ainda pode continuar.'],finishGame)}

function dialog(speaker,lines,onDone=null,choices=null,onChoice=null){paused=true;dialogState={speaker,lines:[...lines],index:0,onDone,choices,onChoice};$('#speakerName').textContent=speaker;$('#portraitGlyph').textContent=speaker==='Rafihx'?'R':'✦';$('#dialogBox').classList.remove('hidden');renderDialog();}
function renderDialog(){const d=dialogState;if(!d)return;$('#dialogText').textContent=d.lines[d.index]||'';$('#dialogCounter').textContent=`${d.index+1}/${d.lines.length}`;const list=$('#choiceList');list.innerHTML='';const atEnd=d.index===d.lines.length-1;if(atEnd&&d.choices){$('#dialogNext').classList.add('hidden');d.choices.forEach(c=>{const b=document.createElement('button');b.textContent=c.text;b.addEventListener('click',()=>{const cb=d.onChoice;closeDialog();if(cb)cb(c.value)});list.appendChild(b)})}else $('#dialogNext').classList.remove('hidden')}
function nextDialog(){const d=dialogState;if(!d)return;if(d.index<d.lines.length-1){d.index++;renderDialog();return}const cb=d.onDone;closeDialog();if(cb)cb()}
function closeDialog(){dialogState=null;$('#dialogBox').classList.add('hidden');$('#choiceList').innerHTML='';paused=!!puzzleState}

function openPuzzle(type,obj){paused=true;puzzleState={type,obj};$('#puzzleOverlay').classList.remove('hidden');$('#puzzleFeedback').textContent='';const title=$('#puzzleTitle'),prompt=$('#puzzlePrompt'),content=$('#puzzleContent');content.innerHTML='';if(type==='memoryOrder'){
 title.textContent='Ordem das lembranças';prompt.textContent='Toque na sequência que representa melhor uma relação real: começo → dificuldade → atitude → continuação.';const options=[['Começo','begin'],['Dificuldade','hard'],['Atitude','act'],['Continuação','continue']];const expected=['begin','hard','act','continue'];let seq=[];const wrap=document.createElement('div');wrap.className='sequence';options.sort(()=>Math.random()-.5).forEach(([label,val])=>{const b=document.createElement('button');b.textContent=label[0];b.title=label;b.onclick=()=>{if(seq.includes(val))return;seq.push(val);b.classList.add('active');if(seq.length===4){if(seq.every((v,i)=>v===expected[i])){state.flags.memoryOrderSolved=true;$('#puzzleFeedback').textContent='Não porque tudo fica bem no fim, mas porque continuar exige atitude no meio.';setTimeout(()=>closePuzzle(true),1000)}else{$('#puzzleFeedback').textContent='Essa ordem não fecha. Tente de novo.';setTimeout(()=>openPuzzle(type,obj),700)}}};wrap.appendChild(b)});content.appendChild(wrap)
 }else if(type==='bridge'){
  title.textContent='Reconstruir a ponte';prompt.textContent='Você encontrou três partes. Qual ordem representa melhor reconstruir confiança?';const opts=[['Responsabilidade','responsabilidade'],['Tempo','tempo'],['Atitudes','atitude']];const expected=['responsabilidade','atitude','tempo'];let seq=[];const wrap=document.createElement('div');wrap.className='bridgeGrid';opts.forEach(([label,val])=>{const b=document.createElement('button');b.className='bridgePiece';b.textContent=label;b.disabled=!state.flags['piece_'+val];if(b.disabled)b.textContent=label+' — ainda não encontrada';b.onclick=()=>{if(seq.includes(val))return;seq.push(val);b.classList.add('selected');if(seq.length===3){if(seq.every((v,i)=>v===expected[i])){state.flags.bridgeSolved=true;$('#puzzleFeedback').textContent='Assumir. Agir diferente. Dar tempo ao tempo.';setTimeout(()=>closePuzzle(true),1000)}else{$('#puzzleFeedback').textContent='Tente pensar menos em “voltar ao normal” e mais em construir de novo.';setTimeout(()=>openPuzzle(type,obj),900)}}};wrap.appendChild(b)});content.appendChild(wrap)
 }}
function closePuzzle(solved=false){const p=puzzleState;puzzleState=null;$('#puzzleOverlay').classList.add('hidden');paused=!!dialogState;if(solved&&p?.obj)p.obj.runtimeDone=true;save();hud()}

function openInventory(){renderInventory();$('#inventoryPanel').classList.remove('hidden');paused=true}
function renderInventory(){const g=$('#inventoryGrid');g.innerHTML='';MEMORIES.forEach(m=>{const card=document.createElement('div');if(hasMem(m.id)){card.className='memoryCard';if(Number.isInteger(m.photo)){const img=document.createElement('img');img.src=`assets/momento-${m.photo+1}.jpg`;img.alt=m.title;card.appendChild(img)}const st=document.createElement('strong');st.textContent=m.title;const sm=document.createElement('small');sm.textContent=m.caption;card.append(st,sm)}else{card.className='memoryCard locked';card.textContent='?'}g.appendChild(card)})}
function closePanel(id){$('#'+id).classList.add('hidden');paused=!!dialogState||!!puzzleState||!$('#photoModal').classList.contains('hidden')}
function togglePause(){if(dialogState||puzzleState)return;const panel=$('#pausePanel');if(panel.classList.contains('hidden')){panel.classList.remove('hidden');paused=true}else closePanel('pausePanel')}
function restartChapter(){if(!chapterSnapshot)return;state=JSON.parse(JSON.stringify(chapterSnapshot));resetRuntimeForChapter();closePanel('pausePanel');hud();save();showChapterCard()}
function resetRuntimeForChapter(){for(const o of current().objects||[])delete o.runtimeDone}

function musicToggle(){if(state.finished)return;if(audio.paused){audio.play().then(()=>{state.music=true;$('#soundBtn').textContent='♫';save()}).catch(()=>toast('Toque novamente para iniciar a música.'))}else{audio.pause();state.music=false;$('#soundBtn').textContent='♩';save()}}
function stopMusic(){audio.pause();audio.currentTime=0;state.music=false}

function finishGame(){if(state.finished)return;state.finished=true;stopMusic();save();cancelAnimationFrame(raf);showScreen('ending');renderEnding();}
function renderEnding(){const stats=[['Capítulos','10/10'],['Memórias',`${state.memories.length}/${MEMORIES.length}`],['Escolhas registradas',String(Object.keys(state.choices).length)],['Tempo de jornada',formatTime(state.playSeconds)],['Progresso','100%']];$('#statList').innerHTML=stats.map(([a,b])=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('');let p=0;const bar=$('#completionBar'),txt=$('#completionPercent');bar.style.width='0%';txt.textContent='0%';$('#finalLetter').classList.add('hidden');const timer=setInterval(()=>{p=Math.min(100,p+2);bar.style.width=p+'%';txt.textContent=p+'%';if(p===100){clearInterval(timer);setTimeout(()=>{$('#completionPhase').style.opacity='.22';$('#finalLetter').classList.remove('hidden')},900)}},48)}
function formatTime(s){s=Math.max(0,Math.floor(s));const m=Math.floor(s/60),sec=s%60;return `${m}m ${String(sec).padStart(2,'0')}s`}

function drawWorld(t){const c=current(),cam=camera();const grad=ctx.createLinearGradient(0,0,VW,VH);grad.addColorStop(0,c.palette[0]);grad.addColorStop(.55,c.palette[1]);grad.addColorStop(1,c.palette[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,VW,VH);ctx.save();ctx.translate(-cam.x,-cam.y);
 // terrain
 ctx.fillStyle='#ffffff06';for(let x=0;x<W;x+=160)for(let y=0;y<H;y+=160){const n=((x*17+y*31)%70);ctx.beginPath();ctx.arc(x+60+n,y+50+(n%35),2+(n%3),0,Math.PI*2);ctx.fill()}
 // paths
 ctx.strokeStyle='#ffffff0c';ctx.lineWidth=80;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(120,1000);ctx.bezierCurveTo(620,760,1080,980,1500,620);ctx.bezierCurveTo(1740,420,1930,500,2080,300);ctx.stroke();
 // obstacles
 for(const r of c.obstacles||[]){ctx.fillStyle=c.interior?'#251f24':'#0b0d12aa';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle='#ffffff08';ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1)}
 // decorative trees/lamps
 for(let i=0;i<36;i++){const x=120+((i*191)%1950),y=140+((i*313)%920);if((c.obstacles||[]).some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h))continue;ctx.fillStyle=c.interior?'#ffffff0a':'#05070b55';ctx.beginPath();ctx.arc(x,y,18+(i%4)*4,0,Math.PI*2);ctx.fill()}
 // gate
 if(c.gate)drawGate(c.gate.x,c.gate.y,c.gate.requires());
 // npcs
 for(const n of c.npcs||[])drawPerson(n.x,n.y,n.name,false,t);
 // objects
 for(const o of c.objects||[]){if(isCompleted(o))continue;drawObject(o,t)}
 // player
 drawPerson(state.x,state.y,'Gaby',true,t);
 ctx.restore();
 const near=nearInteractive();$('#interactHint').classList.toggle('hidden',!near||paused||dialogState||puzzleState);
}
function drawGate(x,y,open){ctx.save();ctx.translate(x,y);ctx.strokeStyle=open?'#d8c8d1':'#756b73';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-28,38);ctx.lineTo(-28,-30);ctx.quadraticCurveTo(0,-62,28,-30);ctx.lineTo(28,38);ctx.stroke();ctx.fillStyle=open?'#e1d5dc22':'#0006';ctx.fillRect(-24,-27,48,65);ctx.restore()}
function drawPerson(x,y,name,player,t){const bob=Math.sin(t/180+(player?0:2))*2;ctx.save();ctx.translate(x,y+bob);ctx.fillStyle=player?'#eee8ec':'#b7aab3';ctx.beginPath();ctx.arc(0,-18,12,0,Math.PI*2);ctx.fill();ctx.fillStyle=player?'#cbb6c3':'#756873';ctx.fillRect(-10,-6,20,32);ctx.fillStyle='#fff';ctx.font='12px system-ui';ctx.textAlign='center';ctx.globalAlpha=.78;ctx.fillText(name,0,-40);ctx.restore()}
function drawObject(o,t){const pulse=1+Math.sin(t/400+o.x*.01)*.09;ctx.save();ctx.translate(o.x,o.y);if(o.t==='photo'&&photoImgs[o.photo]?.complete){ctx.globalAlpha=.82;ctx.drawImage(photoImgs[o.photo],-46,-58,92,92);ctx.strokeStyle='#e7dfe655';ctx.strokeRect(-49,-61,98,98)}else if(o.t==='conversation'){ctx.fillStyle='#817987';ctx.beginPath();ctx.arc(0,0,18*pulse,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(210,205,215,${.18-i*.04})`;ctx.beginPath();ctx.arc(0,0,(35+i*18)*pulse,0,Math.PI*2);ctx.stroke()}}else if(o.t==='piece'||o.t==='key'){ctx.rotate(Math.PI/4);ctx.fillStyle='#d7c7d0';ctx.fillRect(-11,-11,22,22);ctx.rotate(-Math.PI/4)}else{ctx.fillStyle='#dbcbd4';ctx.beginPath();ctx.arc(0,0,12*pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff2e';ctx.beginPath();ctx.arc(0,0,28*pulse,0,Math.PI*2);ctx.stroke()}if(o.label){ctx.fillStyle='#ddd7db';ctx.font='12px system-ui';ctx.textAlign='center';ctx.globalAlpha=.85;ctx.fillText(o.label,0,48)}ctx.restore()}
function loop(t){const dt=Math.min(.035,(t-last)/1000);last=t;if(!paused&&!dialogState&&!puzzleState){let dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),dy=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);const len=Math.hypot(dx,dy)||1;if(dx||dy)move(dx/len,dy/len,dt);state.playSeconds+=dt;if(Math.floor(state.playSeconds)%8===0&&Math.floor(t)%30<16)save()}drawWorld(t);raf=requestAnimationFrame(loop)}

// UI events
$('#newGameBtn').addEventListener('click',newGame);$('#continueBtn').addEventListener('click',continueGame);$('#dialogNext').addEventListener('click',nextDialog);$('#soundBtn').addEventListener('click',musicToggle);$('#menuBtn').addEventListener('click',togglePause);$('#mobileInteract').addEventListener('click',interact);$('#mobileInventory').addEventListener('click',openInventory);$('#inventoryBtn').addEventListener('click',()=>{closePanel('pausePanel');openInventory()});$('#resumeBtn').addEventListener('click',()=>closePanel('pausePanel'));$('#restartChapterBtn').addEventListener('click',restartChapter);$('#backMenuBtn').addEventListener('click',()=>{save();cancelAnimationFrame(raf);showScreen('menu');closePanel('pausePanel');updateContinue()});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closePanel(b.dataset.close)));
$('#photoClose').addEventListener('click',()=>{$('#photoModal').classList.add('hidden');paused=!!dialogState||!!puzzleState});
$('#puzzleClose').addEventListener('click',()=>closePuzzle(false));
window.addEventListener('keydown',e=>{keys[e.key]=true;if((e.key==='e'||e.key==='Enter')&&!e.repeat){if(dialogState&&e.key==='Enter')nextDialog();else interact()}if(e.key==='Escape'&&!e.repeat)togglePause();if((e.key==='i'||e.key==='I')&&!e.repeat)openInventory()});
window.addEventListener('keyup',e=>keys[e.key]=false);
$$('[data-key]').forEach(b=>{const k={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[b.dataset.key];b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.setPointerCapture?.(e.pointerId)});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
window.addEventListener('blur',()=>{for(const k of Object.keys(keys))keys[k]=false});

updateContinue();
})();
