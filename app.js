class SacrificialDominionGame{
constructor(){
this.gameData={
gameSettings:{baseDamage:1,maxHealth:100,bossLevels:[10,20,30,40,50,60],costMultiplier:1.5},
currencies:{credits:{name:"Credits",icon:"💰",color:"#00ff41"},blood:{name:"Blood",icon:"🩸",color:"#dc143c"},souls:{name:"Souls",icon:"👻",color:"#8b5cf6"},corruption:{name:"Corruption",icon:"☠️",color:"#800080"}},
bosses:[
{id:"mech",name:"Steel Titan",level:10,health:500,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/73/image.png",fallback:"🤖",reward:{souls:5}},
{id:"demon",name:"Shadow Demon",level:20,health:2000,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/77/image.png",fallback:"👹",reward:{souls:15}},
{id:"battlemech",name:"War Machine",level:30,health:8000,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/75/image.png",fallback:"🚀",reward:{souls:50}},
{id:"skeleton",name:"Bone Lord",level:40,health:25000,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/74/image.png",fallback:"💀",reward:{souls:120}},
{id:"cyberdragon",name:"Cyber Dragon",level:50,health:75000,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/76/image.png",fallback:"🐉",reward:{souls:300}},
{id:"finalboss",name:"VOID EMPEROR",level:60,health:200000,image:"https://user-gen-media-assets.s3.amazonaws.com/search_results/images/81/image.png",fallback:"👑",reward:{souls:1000}}
],
upgrades:{clickPower:[{id:"plasmaBlade",name:"Plasma Blade",baseCost:{credits:100},damage:5},{id:"bloodSword",name:"Blood Sword",baseCost:{blood:5,credits:200},damage:20},{id:"soulReaper",name:"Soul Reaper",baseCost:{souls:3,credits:1000},damage:100}],autoClickers:[{id:"ghostAlly",name:"Ghost Ally",baseCost:{souls:3},dps:1},{id:"bloodServant",name:"Blood Servant",baseCost:{blood:8},dps:5},{id:"voidMinion",name:"Void Minion",baseCost:{blood:15,souls:3},dps:25}]}};

this.gameState={level:1,health:100,maxHealth:100,clickDamage:1,dps:0,totalClicks:0,totalDamage:0,sacrificesMade:0,healthSacrifices:0,credits:0,blood:0,souls:0,corruption:0,enemyHealth:100,enemyMaxHealth:100,enemyName:"Training Dummy",isBossFight:false,currentBoss:null,bossesDefeated:0,upgrades:{plasmaBlade:0,bloodSword:0,soulReaper:0,ghostAlly:0,bloodServant:0,voidMinion:0},achievements:{firstClick:false,firstSacrifice:false,bossSlayer:false,bloodPact:false,soulCollector:false},quests:{clicks:0,sacrifices:0,damage:0}};

this.audioContext=null;this.sounds={};this.pendingSacrifice=null;this.isInitialized=false;this.gameLoop=null;this.dpsLoop=null;this.antiAutoClick={lastClickTime:0,clickTimes:[],suspicionLevel:0,maxSuspicion:100};}

calculateUpgradeCost(upgradeId){
const upgrade=this.findUpgrade(upgradeId);
if(!upgrade)return null;
const owned=this.gameState.upgrades[upgradeId]||0;
const multiplier=Math.pow(this.gameData.gameSettings.costMultiplier,owned);
const scaledCost={};
Object.keys(upgrade.baseCost).forEach(currency=>{scaledCost[currency]=Math.ceil(upgrade.baseCost[currency]*multiplier);});
return scaledCost;}

checkAutoClicker(){
const now=Date.now();
this.antiAutoClick.clickTimes.push(now);
this.antiAutoClick.clickTimes=this.antiAutoClick.clickTimes.filter(time=>now-time<5000);
if(this.antiAutoClick.clickTimes.length>50){
this.antiAutoClick.suspicionLevel+=10;
console.warn('Suspicious clicking detected...');
if(this.antiAutoClick.suspicionLevel>=this.antiAutoClick.maxSuspicion){
alert('Auto-clicker detected! Resetting progress...');
this.gameState.level=Math.max(1,this.gameState.level-5);
this.antiAutoClick.suspicionLevel=0;
this.antiAutoClick.clickTimes=[];
return false;}}
const timeSinceLastClick=now-this.antiAutoClick.lastClickTime;
if(timeSinceLastClick<50&&this.antiAutoClick.clickTimes.length>10){
this.antiAutoClick.suspicionLevel+=5;
if(this.antiAutoClick.suspicionLevel>50){
console.warn('Please click more naturally...');}}
this.antiAutoClick.lastClickTime=now;
return true;}

initAudio(){try{this.audioContext=new(window.AudioContext||window.webkitAudioContext)();console.log('Audio context initialized');}catch(error){console.warn('Web Audio API not supported:',error);}}

playSound(type,frequency=440,duration=0.2,volume=0.1){
if(!this.audioContext)return;
try{
const oscillator=this.audioContext.createOscillator();
const gainNode=this.audioContext.createGain();
oscillator.connect(gainNode); gainNode.connect(this.audioContext.destination);
switch(type){
case 'click':
oscillator.frequency.setValueAtTime(800,this.audioContext.currentTime);
oscillator.frequency.exponentialRampToValueAtTime(400,this.audioContext.currentTime+0.1);
oscillator.type='square';
gainNode.gain.setValueAtTime(volume,this.audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+duration);break;
case 'purchase':
oscillator.frequency.setValueAtTime(600,this.audioContext.currentTime);
oscillator.frequency.setValueAtTime(800,this.audioContext.currentTime+0.1);
oscillator.frequency.setValueAtTime(1000,this.audioContext.currentTime+0.2);
oscillator.type='square';
gainNode.gain.setValueAtTime(volume,this.audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+0.3);
duration=0.3;break;
case 'sacrifice':
oscillator.frequency.setValueAtTime(200,this.audioContext.currentTime);
oscillator.frequency.exponentialRampToValueAtTime(100,this.audioContext.currentTime+0.5);
oscillator.type='sawtooth';
gainNode.gain.setValueAtTime(volume*0.8,this.audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+0.8);
duration=0.8;break;
case 'boss_defeat':
oscillator.frequency.setValueAtTime(523,this.audioContext.currentTime);
oscillator.frequency.setValueAtTime(659,this.audioContext.currentTime+0.2);
oscillator.frequency.setValueAtTime(784,this.audioContext.currentTime+0.4);
oscillator.frequency.setValueAtTime(1047,this.audioContext.currentTime+0.6);
oscillator.type='triangle';
gainNode.gain.setValueAtTime(volume,this.audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+1);
duration=1;break;
default:
oscillator.frequency.setValueAtTime(frequency,this.audioContext.currentTime);
oscillator.type='square';
gainNode.gain.setValueAtTime(volume,this.audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+duration);}
oscillator.start(this.audioContext.currentTime);
oscillator.stop(this.audioContext.currentTime+duration);}catch(error){console.warn('Sound playback failed:',error);}}

init(){console.log('Initializing Sacrificial Dominion...');
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>this.setupGame());}else{this.setupGame();}}

setupGame(){console.log('Setting up game...');
this.initAudio();
setTimeout(()=>{this.initEventListeners();this.startGameLoops();this.spawnEnemy();this.updateAllUI();this.isInitialized=true;console.log('Game initialized successfully!');},100);}

initEventListeners(){console.log('Initializing event listeners...');
document.addEventListener('click',()=>{if(this.audioContext&&this.audioContext.state==='suspended'){this.audioContext.resume();}},{once:true});

const character=document.getElementById('mainCharacter');
if(character){
character.addEventListener('click',(e)=>{
e.preventDefault();
e.stopPropagation();
console.log('Character clicked!');
this.handleClick(e);
});
character.style.cursor='pointer';
character.style.pointerEvents='auto';
console.log('Character click handler attached successfully');
}

const bossContainer=document.getElementById('bossContainer');
if(bossContainer){
bossContainer.addEventListener('click',(e)=>{
e.preventDefault();
e.stopPropagation();
console.log('Boss clicked!');
this.handleClick(e);
});
bossContainer.style.cursor='pointer';
bossContainer.style.pointerEvents='auto';
}

const healthSacrificeBtn=document.getElementById('healthSacrificeBtn');
if(healthSacrificeBtn){healthSacrificeBtn.addEventListener('click',()=>this.showSacrificeConfirmation('health'));}

const confirmSacrificeBtn=document.getElementById('confirmSacrificeBtn');
const cancelSacrificeBtn=document.getElementById('cancelSacrificeBtn');
if(confirmSacrificeBtn){confirmSacrificeBtn.addEventListener('click',()=>this.confirmSacrifice());}
if(cancelSacrificeBtn){cancelSacrificeBtn.addEventListener('click',()=>this.cancelSacrifice());}

const upgradeButtons=['plasmaBladeBtn','bloodSwordBtn','soulReaperBtn','ghostAllyBtn','bloodServantBtn','voidMinionBtn'];
upgradeButtons.forEach(btnId=>{const btn=document.getElementById(btnId);if(btn){const upgradeId=btnId.replace('Btn','');btn.addEventListener('click',()=>this.buyUpgrade(upgradeId));}});

const closeBossModal=document.getElementById('closeBossModal');
if(closeBossModal){closeBossModal.addEventListener('click',()=>this.closeBossModal());}
console.log('Event listeners initialized');}

showSacrificeConfirmation(type){
const modal=document.getElementById('sacrificeModal');
const title=document.getElementById('sacrificeModalTitle');const text=document.getElementById('sacrificeModalText');
if(!modal||!title||!text)return;
this.pendingSacrifice=type;
if(type==='health'){if(this.gameState.health<=10){alert("Cannot sacrifice health! You need at least 10 health to survive.");return;}
title.textContent='Blood Sacrifice';text.textContent='Sacrifice 10 Health for 5 Blood? This will reduce your current health!';}
modal.classList.remove('hidden');}

confirmSacrifice(){if(this.pendingSacrifice==='health'){this.makeHealthSacrifice();}
this.cancelSacrifice();}

cancelSacrifice(){this.pendingSacrifice=null;const modal=document.getElementById('sacrificeModal');if(modal){modal.classList.add('hidden');}}

handleClick(e){
if(!this.isInitialized){console.log('Game not initialized, ignoring click');return;}
if(!this.checkAutoClicker()){return;}
console.log('Processing click! Current stats - Clicks:',this.gameState.totalClicks,'Level:',this.gameState.level);
this.playSound('click');

let damage=this.calculateTotalClickDamage();
const isCritical=Math.random()<0.1;
if(isCritical){damage*=3;console.log('CRITICAL HIT!');}

this.gameState.enemyHealth-=damage;
this.gameState.enemyHealth=Math.max(0,this.gameState.enemyHealth);
this.gameState.totalClicks++;
this.gameState.totalDamage+=damage;
this.gameState.quests.clicks++;
this.gameState.quests.damage+=damage;
this.gameState.credits+=damage;

console.log(`Click processed! Damage: ${damage}, New stats - Clicks: ${this.gameState.totalClicks}, Credits: ${this.gameState.credits}, Enemy HP: ${this.gameState.enemyHealth}/${this.gameState.enemyMaxHealth}`);

this.createClickEffect(e,damage,isCritical);

if(this.gameState.enemyHealth<=0){
console.log('Enemy defeated!');
this.defeatEnemy();
}

this.checkAchievements();
this.updateAllUI();
}

createClickEffect(e,damage,isCritical=false){
const target=this.gameState.isBossFight?document.getElementById('bossContainer'):document.getElementById('mainCharacter');
const clickEffects=document.getElementById('clickEffects');
if(!target||!clickEffects)return;
const rect=target.getBoundingClientRect();
const x=(e.clientX||e.pageX||rect.width/2)-rect.left;
const y=(e.clientY||e.pageY||rect.height/2)-rect.top;
const effect=document.createElement('div');
effect.className='click-effect'+(isCritical?' critical':'');
effect.textContent=`+${damage}`;
effect.style.left=`${Math.max(0,x-20)}px`;
effect.style.top=`${Math.max(0,y-10)}px`;
effect.style.position='absolute';
effect.style.zIndex='1000';
clickEffects.appendChild(effect);
setTimeout(()=>{if(clickEffects.contains(effect)){clickEffects.removeChild(effect);}},1000);
}

defeatEnemy(){
if(this.gameState.isBossFight){
this.defeatBoss();
}else{
this.gameState.level++;
console.log(`Level up! Now level ${this.gameState.level}`);
if(this.gameData.gameSettings.bossLevels.includes(this.gameState.level)){
console.log(`Spawning boss at level ${this.gameState.level}`);
this.spawnBoss();
}else{
this.spawnEnemy();
}
}
}

defeatBoss(){const boss=this.gameState.currentBoss;this.gameState.bossesDefeated++;console.log(`Boss defeated! Bosses defeated: ${this.gameState.bossesDefeated}`);
this.playSound('boss_defeat');
this.gameState.souls+=boss.reward.souls;
this.showBossModal(boss);
this.gameState.isBossFight=false;this.gameState.currentBoss=null;
this.hideBoss();this.spawnEnemy();}

spawnBoss(){const bossIndex=this.gameData.gameSettings.bossLevels.indexOf(this.gameState.level);
if(bossIndex===-1||bossIndex>=this.gameData.bosses.length)return;
const boss=this.gameData.bosses[bossIndex];
this.gameState.isBossFight=true;this.gameState.currentBoss=boss;this.gameState.enemyName=boss.name;this.gameState.enemyHealth=boss.health;this.gameState.enemyMaxHealth=boss.health;
this.showBoss(boss);
console.log(`Boss spawned: ${boss.name} with ${boss.health} HP`);}

showBoss(boss){const bossContainer=document.getElementById('bossContainer');
const bossImage=document.getElementById('bossImage');
const bossFallback=document.getElementById('bossFallback');
const character=document.getElementById('mainCharacter');
if(bossContainer&&bossImage&&bossFallback&&character){
character.style.display='none';
bossContainer.style.display='flex';
bossImage.src=boss.image;
bossImage.alt=boss.name;
bossImage.style.display='block';
bossFallback.style.display='none';
bossFallback.textContent=boss.fallback;
bossImage.onerror=()=>{console.log(`Failed to load boss image: ${boss.image}`);
bossImage.style.display='none';
bossFallback.style.display='flex';};
bossImage.onload=()=>{console.log(`Boss image loaded: ${boss.name}`);
bossImage.style.display='block';
bossFallback.style.display='none';};
console.log(`Boss display updated: ${boss.name}`);
}}

hideBoss(){const bossContainer=document.getElementById('bossContainer');const character=document.getElementById('mainCharacter');
if(bossContainer&&character){bossContainer.style.display='none';character.style.display='block';}}

spawnEnemy(){if(this.gameState.isBossFight)return;
const baseHealth=50;const healthMultiplier=Math.pow(1.15,this.gameState.level-1);
this.gameState.enemyName=`Enemy Level ${this.gameState.level}`;this.gameState.enemyMaxHealth=Math.floor(baseHealth*healthMultiplier);this.gameState.enemyHealth=this.gameState.enemyMaxHealth;
console.log(`Enemy spawned: ${this.gameState.enemyName} with ${this.gameState.enemyMaxHealth} HP`);}

makeHealthSacrifice(){if(this.gameState.health<=10){alert("Cannot sacrifice more health!");return;}
this.playSound('sacrifice');
this.gameState.health-=10;this.gameState.blood+=5;this.gameState.sacrificesMade++;this.gameState.healthSacrifices++;this.gameState.quests.sacrifices++;
console.log('Health sacrificed! Blood gained:',5);this.checkAchievements();this.updateAllUI();}

buyUpgrade(upgradeId){const upgrade=this.findUpgrade(upgradeId);
if(!upgrade){console.log(`Upgrade not found: ${upgradeId}`);return;}
const currentCost=this.calculateUpgradeCost(upgradeId);
if(!currentCost){console.log(`Could not calculate cost for: ${upgradeId}`);return;}
if(!this.canAfford(currentCost)){console.log(`Cannot afford upgrade: ${upgradeId}`,currentCost);return;}
this.playSound('purchase');
Object.keys(currentCost).forEach(currency=>{this.gameState[currency]-=currentCost[currency];});
this.gameState.upgrades[upgradeId]++;
this.calculateDPS();
console.log(`Upgrade purchased: ${upgradeId}, owned: ${this.gameState.upgrades[upgradeId]}, cost was:`,currentCost);this.updateAllUI();}

findUpgrade(upgradeId){
for(let upgrade of this.gameData.upgrades.clickPower){if(upgrade.id===upgradeId)return upgrade;}
for(let upgrade of this.gameData.upgrades.autoClickers){if(upgrade.id===upgradeId)return upgrade;}
return null;}

canAfford(cost){return Object.keys(cost).every(currency=>{return this.gameState[currency]>=cost[currency];});}

calculateDPS(){let dps=0;
dps+=this.gameState.upgrades.ghostAlly*1;dps+=this.gameState.upgrades.bloodServant*5;dps+=this.gameState.upgrades.voidMinion*25;
this.gameState.dps=dps;return dps;}

healWithSouls(){if(this.gameState.souls>=1&&this.gameState.health<this.gameState.maxHealth){
this.gameState.souls--;this.gameState.health=Math.min(this.gameState.maxHealth,this.gameState.health+25);
console.log('Healed with soul! Health:',this.gameState.health);this.updateAllUI();}}

checkAchievements(){
if(!this.gameState.achievements.firstClick&&this.gameState.totalClicks>=1){this.gameState.achievements.firstClick=true;this.showAchievement('firstClick');}
if(!this.gameState.achievements.firstSacrifice&&this.gameState.sacrificesMade>=1){this.gameState.achievements.firstSacrifice=true;this.showAchievement('firstSacrifice');}
if(!this.gameState.achievements.bossSlayer&&this.gameState.bossesDefeated>=1){this.gameState.achievements.bossSlayer=true;this.showAchievement('bossSlayer');}
if(!this.gameState.achievements.bloodPact&&this.gameState.healthSacrifices>=1){this.gameState.achievements.bloodPact=true;this.showAchievement('bloodPact');}
if(!this.gameState.achievements.soulCollector&&this.gameState.souls>=20){this.gameState.achievements.soulCollector=true;this.showAchievement('soulCollector');}}

showAchievement(achievementId){const element=document.getElementById(`achievement-${achievementId}`);
if(element){element.classList.add('completed');}
console.log(`Achievement unlocked: ${achievementId}`);}

showBossModal(boss){const modal=document.getElementById('bossModal');const title=document.getElementById('bossModalTitle');const modalBossImage=document.getElementById('modalBossImage');const modalBossFallback=document.getElementById('modalBossFallback');const rewardText=document.getElementById('bossRewardText');const unlockText=document.getElementById('bossUnlockText');
if(modal&&title&&modalBossImage&&modalBossFallback&&rewardText){title.textContent=`${boss.name} Defeated!`;
modalBossImage.src=boss.image;
modalBossImage.alt=boss.name;
modalBossImage.style.display='block';
modalBossFallback.style.display='none';
modalBossFallback.textContent=boss.fallback;
modalBossImage.onerror=()=>{console.log(`Failed to load modal boss image: ${boss.image}`);
modalBossImage.style.display='none';
modalBossFallback.style.display='flex';};
modalBossImage.onload=()=>{console.log(`Modal boss image loaded: ${boss.name}`);
modalBossImage.style.display='block';
modalBossFallback.style.display='none';};
rewardText.textContent=`You gained ${boss.reward.souls} Souls!`;
if(unlockText){unlockText.textContent="Your power grows with each fallen enemy...";unlockText.style.display='block';}
modal.classList.remove('hidden');}}

closeBossModal(){const modal=document.getElementById('bossModal');if(modal){modal.classList.add('hidden');}}

startGameLoops(){console.log('Starting game loops...');
this.gameLoop=setInterval(()=>{if(this.isInitialized){this.updateAllUI();}},100);
this.dpsLoop=setInterval(()=>{if(this.isInitialized&&this.gameState.dps>0){const dpsPerSecond=this.gameState.dps;this.gameState.enemyHealth-=dpsPerSecond;this.gameState.enemyHealth=Math.max(0,this.gameState.enemyHealth);this.gameState.totalDamage+=dpsPerSecond;this.gameState.quests.damage+=dpsPerSecond;
const credits=dpsPerSecond;this.gameState.credits+=credits;
if(this.gameState.enemyHealth<=0){this.defeatEnemy();}}},1000);
setInterval(()=>{if(this.gameState.souls>=1&&this.gameState.health<this.gameState.maxHealth-10){this.healWithSouls();}},5000);}

updateAllUI(){this.updateStats();this.updateCurrencies();this.updateBossHealth();this.updateProgress();this.updateUpgradeButtons();this.updateSacrificeButtons();this.updateQuests();}

updateStats(){this.safeUpdateElement('playerLevel',this.gameState.level);
this.safeUpdateElement('currentHealth',this.gameState.health);this.safeUpdateElement('maxHealth',this.gameState.maxHealth);this.safeUpdateElement('clickDamage',this.calculateTotalClickDamage());this.safeUpdateElement('dpsValue',this.gameState.dps);this.safeUpdateElement('totalClicks',this.gameState.totalClicks);}

updateCurrencies(){
this.safeUpdateElement('creditsAmount',this.formatNumber(this.gameState.credits));
this.safeUpdateElement('bloodAmount',this.formatNumber(this.gameState.blood));
this.safeUpdateElement('soulsAmount',this.formatNumber(this.gameState.souls));
this.safeUpdateElement('corruptionAmount',this.formatNumber(this.gameState.corruption));}

updateBossHealth(){const healthPercent=this.gameState.enemyMaxHealth>0?(this.gameState.enemyHealth/this.gameState.enemyMaxHealth)*100:0;
const healthFill=document.getElementById('bossHealthFill');
if(healthFill){healthFill.style.width=`${Math.max(0,healthPercent)}%`;}
this.safeUpdateElement('bossName',this.gameState.enemyName);this.safeUpdateElement('bossCurrentHealth',Math.max(0,Math.floor(this.gameState.enemyHealth)));this.safeUpdateElement('bossMaxHealth',this.gameState.enemyMaxHealth);}

updateProgress(){const currentLevel=this.gameState.level;
const nextBossLevel=this.gameData.gameSettings.bossLevels.find(level=>level>currentLevel)||100;
const prevBossLevel=this.gameData.gameSettings.bossLevels.slice().reverse().find(level=>level<=currentLevel)||0;
const progress=Math.min(100,((currentLevel-prevBossLevel)/(nextBossLevel-prevBossLevel))*100);
const progressFill=document.getElementById('bossProgress');
if(progressFill){progressFill.style.width=`${progress}%`;}
this.safeUpdateElement('currentLevel',currentLevel);this.safeUpdateElement('nextBossLevel',nextBossLevel);}

updateUpgradeButtons(){const upgradeIds=['plasmaBlade','bloodSword','soulReaper','ghostAlly','bloodServant','voidMinion'];
upgradeIds.forEach(upgradeId=>{const btn=document.getElementById(`${upgradeId}Btn`);const costElement=document.getElementById(`${upgradeId}Cost`);
if(btn){const currentCost=this.calculateUpgradeCost(upgradeId);
if(currentCost){const canAfford=this.canAfford(currentCost);btn.disabled=!canAfford;
if(canAfford){btn.style.opacity='1';btn.style.cursor='pointer';}else{btn.style.opacity='0.5';btn.style.cursor='not-allowed';}
if(costElement){const costText=Object.keys(currentCost).map(currency=>{const icon=this.gameData.currencies[currency].icon;return `${icon} ${currentCost[currency]}`;}).join(' + ');costElement.innerHTML=costText;}}}});}

updateSacrificeButtons(){const healthBtn=document.getElementById('healthSacrificeBtn');
if(healthBtn){healthBtn.disabled=this.gameState.health<=10;}}

updateQuests(){this.safeUpdateElement('quest-clicks',this.gameState.quests.clicks);this.safeUpdateElement('quest-sacrifices',this.gameState.quests.sacrifices);this.safeUpdateElement('quest-damage',this.formatNumber(this.gameState.quests.damage));}

calculateTotalClickDamage(){let damage=this.gameState.clickDamage;
damage+=this.gameState.upgrades.plasmaBlade*5;damage+=this.gameState.upgrades.bloodSword*20;damage+=this.gameState.upgrades.soulReaper*100;return damage;}

safeUpdateElement(id,value){const element=document.getElementById(id);if(element){element.textContent=value;}}

formatNumber(num){if(typeof num!=='number'||isNaN(num))return '0';
if(num<1000)return Math.floor(num).toString();
if(num<1000000)return(num/1000).toFixed(1)+'K';
if(num<1000000000)return(num/1000000).toFixed(1)+'M';
return(num/1000000000).toFixed(1)+'B';}
}

console.log('Script loaded, creating game instance...');
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{console.log('DOM loaded, starting game...');window.sacrificialGame=new SacrificialDominionGame();window.sacrificialGame.init();});}else{console.log('DOM ready, starting game...');
window.sacrificialGame=new SacrificialDominionGame();window.sacrificialGame.init();}