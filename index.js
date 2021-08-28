let { registerFont, createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs').promises;
const express = require('express');
const canvasWidth = 350;
let ctx = "";

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

app.post('/getImage', async function (req, res) {
    const image = await buildImage(req.body.progress);
    res.send(image);
})

app.get('/', (req, res) => {
  res.status(200).send('Health Check');
});


async function buildImage(data){
  let numRows = Math.floor(data.loot.length/7);
  const canvasHeight = 150 + (60*numRows);
  let canvas = createCanvas(canvasWidth, canvasHeight);
  ctx = canvas.getContext("2d");
  registerFont(__dirname.concat('/font/runescape.ttf'), { family: 'Runescape' });
  
  ctx.fillStyle = "#36393f";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.font = "14px Runescape";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffff00";
  
  const d = new Date();
  ctx.strokeText(d.toLocaleDateString('en-US'), 30, 40);
  ctx.fillText(d.toLocaleDateString('en-US'), 30, 40);
  ctx.font = "24px Runescape";

  ctx.strokeText(`🕒${data.runtime} minutes`, 25, 70);
  ctx.fillText(`🕒${data.runtime} minutes`, 25, 70);

  ctx.font = "30px Runescape";
  ctx.strokeText("Loot:", 30, 110);
  ctx.fillText("Loot:", 30, 110);

  let images = await getMultiple(data);
  let itemsReady = await loadItems(images, ctx);
  let skillsOpened = await openSkills(data.xp_earned);
  let skillsLoaded = await loadSkills(skillsOpened, ctx);

  const response = {
    statusCode: 200,
    body: JSON.stringify(canvas.toDataURL()),
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

async function loadSkills(objs, ctx) {
  await Promise.all(objs.map((obj, index) =>
    loadImage(obj.img).then((imageObj) => {
      paintSkills(ctx, imageObj, index, `${obj.xp} xp`);
    })
  ));
}

function paintSkills(ctx, image, index, xp){
  const xOffset = canvasWidth - 30;
  const yOffset = 40 + (index*30);
  ctx.drawImage(image, xOffset, yOffset-15);
  ctx.font = "16px Runescape";
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffff00";

  ctx.strokeText(xp, xOffset-5, yOffset);
  ctx.fillText(xp, xOffset-5, yOffset);
}


function paintIcons(ctx, image, index, count){
  const xOffset = 30 + (40 * (index % 7));
  const row = Math.floor(index/7);
  const yOffset = 120 + (row*40);
  ctx.drawImage(image, xOffset, yOffset);
  ctx.font = "12px Runescape";
  ctx.textAlign = "right";
  if (count >= 1000000) {
    count = `${Math.floor(count / 1000000)}m`;
  }
  if (count > 1000) {
    count = `${Math.trunc((count * 10) / 1000) / 10}k`;
  }
  ctx.lineWidth = 3;
  ctx.strokeText(count, xOffset + 30, yOffset+30);
  ctx.fillText(count, xOffset+ 30, yOffset+30)
}

async function getMultiple(objectsToGet) {
  let items = [];
  await Promise.all(objectsToGet.loot.map(obj =>
    axios.get(`https://api.osrsbox.com/items/${obj.id}`).then(response => {
      items.push({'img': response.data.icon, 'count': obj.count});
    })
  ));
  return items;
}