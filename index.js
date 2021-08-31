let { registerFont, createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs').promises;
const express = require('express');
const canvasWidth = 330;
let ctx = "";

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

app.post('/getImage', async function (req, res) {
    const image = await buildImage(req.body);
    res.send(image);
})

app.get('/', (req, res) => {
  // res.status(200).send('Health Check');
  res.sendFile('test/test.html' , { root : __dirname});
});


async function buildImage(data){

  //calculate size and rows and stuff
  const titleHeight = 80;

  let lootHeight = 0;
  if(data?.loot?.length > 0){
    let numLootRows = Math.floor(data.loot.length/7) +1;
    if(data.loot.length % 7 == 0){
      numLootRows--;
    }
    lootHeight = 45 + (35*numLootRows);
  }
  
  let xpHeight = 0;
  if(data?.xp_earned?.length>0){
    let numSkillRows = Math.floor(data.xp_earned.length/6) + 1;
    xpHeight = 40 + (numSkillRows * 50);
  }

  const canvasHeight = titleHeight + lootHeight + xpHeight;

  let canvas = createCanvas(canvasWidth, canvasHeight);
  ctx = canvas.getContext("2d");
  registerFont(__dirname.concat('/font/runescape.ttf'), { family: 'Runescape' });
  ctx.lineWidth = 2;
  const r_a = 0.8;
  //ctx.fillStyle = "#36393f";
  ctx.fillStyle = `rgba(54, 57, 63, ${r_a})`;
  //ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffff00";

  //write the script name
  ctx.font = "30px Runescape";
  ctx.strokeText(data?.script_name, 15, 40);
  ctx.fillText(data?.script_name, 15, 40);


  //write the date and runtime
  ctx.font = "16px Runescape";
  const runtime = minsToString(data.runtime);
  const curDate = new Date().toLocaleDateString('en-US');
  ctx.strokeText(`${curDate} - ${runtime}`, 15, 60);
  ctx.fillText(`${curDate} - ${runtime}`, 15, 60);


  //draw outline
  // ctx.lineWidth = 10;
  // ctx.beginPath();
  // ctx.moveTo(0,0);
  // ctx.lineTo(canvasWidth, 0);
  // ctx.lineTo(canvasWidth, canvasHeight);
  // ctx.lineTo(0, canvasHeight);
  // ctx.lineTo(0, 0);
  // ctx.stroke();

  //draw dividers
  ctx.lineWidth = .5;
  ctx.beginPath();
  ctx.moveTo(0,titleHeight);
  ctx.lineTo(canvasWidth, titleHeight);
  ctx.stroke();
  if(lootHeight && xpHeight){
    ctx.beginPath();
    ctx.moveTo(0,titleHeight + lootHeight);
    ctx.lineTo(canvasWidth, titleHeight + lootHeight);
    ctx.stroke();
  }


  //the loot
  if(data?.loot?.length){
    ctx.lineWidth = 2;
    ctx.textAlign = "left";
    ctx.font = "20px Runescape";
    ctx.strokeText("Loot:", 15, 110);
    ctx.fillText("Loot:", 15, 110);
    let images = await getMultiple(data);
    let itemsReady = await loadItems(images, ctx);
  }

  //the xp
  if(data?.xp_earned){
    ctx.lineWidth = 2;
    ctx.font = "20px Runescape";
    ctx.textAlign = "left";
    ctx.strokeText("XP:", 15, 30+ titleHeight+lootHeight);
    ctx.fillText("XP:", 15, 30 +titleHeight+lootHeight);
    let skillsOpened = await openSkills(data.xp_earned);
    let skillsLoaded = await loadSkills(skillsOpened, ctx, titleHeight + lootHeight);
  }

  //the prog report
  const response = {
    statusCode: 200,
    body: JSON.stringify(canvas.toDataURL())
  };

  return response;
}

async function loadItems(objs, ctx) {
  await Promise.all(objs.map((obj, index) =>
    loadImage(`data:image/png;base64,${obj.img}`).then((imageObj) => {
      paintIcons(ctx, imageObj, index, obj.count);
    })
  ));
}

async function openSkills(objs) {
  let skills = [];
  await Promise.all(objs.map((obj) => 
    getSkill(`${__dirname}/icons/${obj.skill}.png`).then(response => {
      skills.push({'img': `data:image/png;base64,${response.toString('base64')}`, 'xp': obj.xp});
    })
  ));
  return skills;
}

const getSkill = async(file)=>{
  const result = await fs.readFile(file)
  return result;
}

async function loadSkills(objs, ctx, offset) {
  await Promise.all(objs.map((obj, index) =>
    loadImage(obj.img).then((imageObj) => {
      paintSkills(ctx, imageObj, index, offset, `${obj.xp} xp`);
    })
  ));
}

function paintSkills(ctx, image, index, offset, xp){
  const yOffset = offset + 40 + (50 * Math.floor(index / 5));
  const xOffset = 15 + (60 * (index % 5));
  ctx.drawImage(image, xOffset, yOffset, 25, 25);
  ctx.font = "16px Runescape";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffff00";
  const xpInt = parseInt(xp.replace(/,/g, ''));
  let xpGained = '';
  if (xpInt >= 1000000) {
    xpGained = `${Math.floor(xpInt*10 / 1000000)/10}m xp`;
  }
  else if (xpInt > 1000) {
    xpGained = `${Math.trunc((xpInt * 10) / 1000 / 10)}k xp`;
  } else {
    xpGained = `${xpInt} xp`;
  }
  ctx.strokeText(xpGained, xOffset+15, yOffset+35);
  ctx.fillText(xpGained, xOffset+15, yOffset+35);
  // const start = Math.floor(Math.random() * 99);
  // const finish = Math.floor(Math.random() * (99 - start) + start); 
  // ctx.font = "14px Runescape";
  // ctx.strokeText(`${start}-${finish}`, xOffset+15, yOffset+50);
  // ctx.fillText(`${start}-${finish}`, xOffset+15, yOffset+50);
}


function paintIcons(ctx, image, index, count){
  const xOffset = 15 + (40 * (index % 7));
  const row = Math.floor(index/7);
  const yOffset = 115 + row*35;
  ctx.drawImage(image, xOffset, yOffset);
  ctx.font = "14px Runescape";
  ctx.textAlign = "right";
  if (count >= 1000000) {
    count = `${Math.floor(count *10 / 1000000)/ 10}m`;
  }
  else if (count > 100000) {
    count = `${Math.trunc(count/ 1000)}k`;
  }
  else if (count > 1000) {
    count = `${Math.trunc((count * 10) / 1000) / 10}k`;
  }
  ctx.lineWidth = 2;
  ctx.strokeText(count, xOffset+30, yOffset+30);
  ctx.fillText(count, xOffset+30, yOffset+30)
}

async function getMultiple(objectsToGet) {
  let items = [];
  objectsToGet.loot.forEach((item) => {
    const coins = [617,995,996,997,998,999,1000,1001,1002,1003,1004,6964,8890,8891,8892,8893,8894,8895,8896,8897,8898,8899,14440,18028];
    if(coins.indexOf(item.id) != -1){
      if (item.count > 50000){
        item.id = 1004;
      } else if (item.count > 10000){
        item.id = 1003;
      } else if (item.count > 1000 ){
        item.id = 1001;
      } else {
        item.id = 998;
      }
    }
  });
  await Promise.all(objectsToGet.loot.map(obj =>
    axios.get(`https://api.osrsbox.com/items/${obj.id}`).then(response => {
      items.push({'img': response.data.icon, 'count': obj.count});
    })
  ));
  return items;
}

function minsToString(mins){
  const runtimeHours = Math.floor(mins / 60);
  const runtimeMins = (mins % 60);
  let runtime = '';
  if(runtimeHours > 0){
    if(runtimeHours == 1 ){
      runtime += `${runtimeHours}hr `;
    } else {
      runtime += `${runtimeHours}hrs `;
    }
  }
  if(runtimeMins >0){
    if(runtimeMins == 1 ){
      runtime += `${runtimeMins}min`;
    }
    runtime += `${runtimeMins}mins`;
  }
  return runtime;
}