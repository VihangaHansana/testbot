// Import required modules
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const express = require('express');
const events = require('./command');

// Constants
const prefix = '.';
const ownerNumber = ['94782303652']; // Owner number

// Create an Express app
const app = express();
const port = process.env.PORT || 8000;

//===================SESSION-AUTH============================

if (!fs.existsSync(__dirname + '/auth_info_baileys/creds.json')) {
    if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
    
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
        if (err) throw err;
        fs.writeFile(__dirname + '/auth_info_baileys/creds.json', data, () => {
            console.log("Session downloaded Successfully ✅");
        });
    });
}

//=============================================

async function connectToWA() {
    console.log("Connecting VIHANGA BOT 🧬...");
    
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                connectToWA();
            }
        } else if (connection === 'open') {
            console.log('😼 Installing plugins...');
            const path = require('path');
            fs.readdirSync("./plugins/").forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() == ".js") {
                    require("./plugins/" + plugin);
                }
            });
            console.log('Plugins installed successfully ✅');
            console.log('Bot connected to WhatsApp ✅');

            const up = `Wa-BOT connected successfully ✅\n\nPREFIX: ${prefix}`;
            conn.sendMessage(`${ownerNumber}@s.whatsapp.net`, {
                image: { url: `https://telegra.ph/file/900435c6d3157c98c3c88.jpg` },
                caption: up
            });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const from = mek.key.remoteJid;
        const body = (type === 'conversation') ? mek.message.conversation :
            (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
            (type === 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption :
            (type === 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption : '';
        
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const isGroup = from.endsWith('@g.us');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = ownerNumber.includes(senderNumber) || isMe;
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(() => {}) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        };

        // Function to send media by URL
        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            try {
                const res = await axios.head(url);
                const mime = res.headers['content-type'];
                const buffer = await getBuffer(url);

                if (mime.includes("gif")) {
                    return conn.sendMessage(jid, { video: buffer, caption, gifPlayback: true, ...options }, { quoted, ...options });
                }
                if (mime.includes("application/pdf")) {
                    return conn.sendMessage(jid, { document: buffer, mimetype: 'application/pdf', caption, ...options }, { quoted, ...options });
                }
                if (mime.startsWith("image")) {
                    return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted, ...options });
                }
                if (mime.startsWith("video")) {
                    return conn.sendMessage(jid, { video: buffer, caption, mimetype: 'video/mp4', ...options }, { quoted, ...options });
                }
                if (mime.startsWith("audio")) {
                    return conn.sendMessage(jid, { audio: buffer, caption, mimetype: 'audio/mpeg', ...options }, { quoted, ...options });
                }
            } catch (e) {
                console.error('Error sending file from URL:', e);
            }
        };

        // Command handling
        const cmdName = isCmd ? command : false;
        if (isCmd) {
            const cmd = events.commands.find(cmd => cmd.pattern === cmdName) ||
                events.commands.find(cmd => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });

                try {
                    cmd.function(conn, mek, m, {
                        from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber,
                        pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
                    });
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }

        // Event-based commands
        events.commands.map(async (command) => {
            if (body && command.on === "body") {
                command.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
            } else if (mek.q && command.on === "text") {
                command.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
            } else if ((command.on === "image" || command.on === "photo") && mek.type === "imageMessage") {
                command.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
            } else if (command.on === "sticker" && mek.type === "stickerMessage") {
                command.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
            }
        });
    });
}

// Start Express server
app.get("/", (req, res) => {
    res.send("Hey, bot started✅");
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

// Connect to WhatsApp after a delay
setTimeout(() => {
    connectToWA();
}, 4000);
