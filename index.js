let { registerFont, createCanvas, Image, loadImage } = require('canvas');
let canvas = createCanvas(350, 180);
var ctx = canvas.getContext("2d");
const axios = require('axios');
const x = 30;
const express = require('express');


const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json())

const PORT = process.env.PORT || 3000;

app.post('/getImage', async function (req, res) {
    console.log(req.body.progress);
    const image = await buildImage(req.body.progress);
    console.log(image);
    res.send(image);
})

app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

async function buildImage(data){
  console.log(data);
  registerFont(__dirname.concat('/font/runescape.ttf'), { family: 'Runescape' });
  
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 350, 180);
  ctx.font = "12px Runescape";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffff00";
  
  const d = new Date();
  ctx.fillText(d.toLocaleDateString('en-US'), 30, 40);
  ctx.font = "24px Runescape";

  ctx.fillText(`Runtime: ${data.runtime} minutes`, 30, 70);

  ctx.font = "30px Runescape";
  ctx.fillText("Loot:", 30, 110);

  let images = await getMultiple(data);
  let painted = await loadImages(images, data);
  const response = {
    statusCode: 200,
    body: JSON.stringify(canvas.toDataURL()),
  };
  
  return response;
}

async function loadImages(objs, data) {
  let images = [];
  await Promise.all(objs.map((obj,index) =>
    loadImage(`data:image/png;base64,${obj}`).then((imageObj) => {
      paintImages(imageObj, index, data);
    })
  ));
  return images;
}

function paintImages(image, index, data){
    const offset = 40 * index;
    ctx.drawImage(image, x + offset, 120);
    ctx.font = "12px Runescape";
    ctx.textAlign = "right";
    const count = data.loot[index].count;
    if (count >= 1000000) {
    count = `${Math.floor(count / 1000000)}m`;
    }
    if (count > 1000) {
    count = `${Math.trunc((count * 10) / 1000) / 10}k`;
    }
    ctx.lineWidth = 3;
    ctx.strokeText(count, x + offset + 30, 150);
    ctx.fillText(count, x + offset+ 30, 150)
}

async function getMultiple(objectsToGet) {
  console.log(objectsToGet);
  let items = [];
  await Promise.all(objectsToGet.loot.map(obj =>
    axios.get(`https://api.osrsbox.com/items/${obj.id}`).then(response => {
      items.push(response.data.icon);
    })
  ));
  return items;
}

function sendResponse(){
  const response = {
    statusCode: 200,
    body: JSON.stringify(canvas.toDataURL()),
  };

  return response;
}