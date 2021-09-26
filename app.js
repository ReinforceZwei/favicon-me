var getFavicons = require('get-website-favicon')
const fs = require("fs");
const path = require('path');
const axios = require('axios').default;
const express = require('express');
const { exit } = require('process');

const app = express()
const port = 3000
const cacheDir = "./favicon-cache";

if (!fs.existsSync(cacheDir)) {
    console.error(`Cache directory ${cacheDir} does not exist`);
    exit(1);
}

app.get('/', (req, res) => {
    if (req.query.url && typeof req.query.url === 'string') {
        let urlString = req.query.url;
        if (!urlString.startsWith('http')) {
            // URL class require 'http'
            urlString = 'http://' + urlString;
        }
        let u = new URL(urlString);
        //res.set('Content-Type', 'image/png');
        let cachePath = cacheLookup(u.host)
        if (cachePath !== false) {
            log(u.host + " - Cache hit");
            res.sendFile(__dirname + cachePath);
        } else {
            log(u.host + " - Fetching icon");
            getFavicons(urlString).then(data => {
                if (data.icons.length > 0) {
                    let tmp = data.icons.reverse()[0];
                    let src = tmp.src;
                    let type = tmp.type;
                    axios.get(src, {responseType: 'arraybuffer'}).then(r => {
                        let buf = Buffer.from(r.data);
                        res.send(buf);
                        cacheSave(u.host, buf, mimeToExt(type));
                    })
                } else {
                    log(u.host + " - Unable to find icon");
                    res.sendFile(__dirname + './default.png');
                }
            })
        }
    } else {
        res.sendFile(__dirname + './default.html');
    }
})

app.get('/debug', (req, res) => {
    if (req.query.url && typeof req.query.url === 'string') {
        let urlString = req.query.url;
        if (!urlString.startsWith('http')) {
            urlString = 'http://' + urlString;
        }
        let u = new URL(urlString);
        res.set('Content-Type', 'text/plain');
        getFavicons(urlString).then(data => {
            res.send(JSON.stringify(data, 4))
        })
    }
})

app.listen(port, () => {
    log(`Listening on port ${port}`);
})

// getFavicons('note.reinforce.moe/a.png').then(data=>{
//     console.log(data);
//     let icon = data.icons.reverse()[0].src;
//     console.log(icon);
//     axios.get(icon, {responseType: 'arraybuffer'}).then(r => {
//         let buf = Buffer.from(r.data);
//         fs.createWriteStream('./test.png').write(buf);
//         //console.log(r.data);
//     })
// })

function log(str) {
    console.log(`[${new Date().toISOString()}] ${str}`);
}

function cacheLookup(domain) {
    let items = fs.readdirSync(cacheDir);
    let domains = items.map(i => { return path.parse(i).name });
    if (domains.includes(domain)) {
        return cacheDir + '/' + items[domains.indexOf(domain)];
    }
    return false;
}

function cacheGet(file) {
    return fs.readFileSync(cacheDir + '/' + file)
}

function cacheSave(domain, buf, ext) {
    s = fs.createWriteStream(cacheDir + '/' + domain + ext);
    s.write(buf);
    s.end();
    s.close();
}

function mimeToExt(mime) {
    switch (mime.toLowerCase()) {
        case 'image/x-icon': return '.ico';
        case 'image/png':    return '.png';
        case 'image/*':      return '.png';
        case 'image/svg+xml':return '.svg';
        case 'image/webp':   return '.webp';
        case 'image/jpeg':   return '.jpg';
        case 'image/gif':    return '.gif';
        default:             return '';
    }
}