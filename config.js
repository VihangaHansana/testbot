const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID,
ALIVE_IMG: process.env.ALIVE_IMG || "https://envs.sh/0Nq.jpg",
ALIVE_MSG: process.env.ALIVE_MSG || "ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴠɪʜᴀɴɢᴀ ʙᴏᴛ ᴏꜰꜰɪᴄɪᴀʟ ɢʀᴏᴜᴩ.

Owner - ᴠɪʜᴀɴɢᴀ ʜᴀɴꜱᴀɴᴀ

පහත දක්වා ඇති සියලු නීති ඔබ විසින් පිළිපැදිය යුතු අතර, එසේ නොකරහොත් ඔබව සමුහයෙන් ඉවත් කරනු ලැබේ.

⭕ සමුහයේ සිටින සෑම සාමාජිකයෙකුටම ගරු කල යුතු අතර ඔවුන්ට බාධාවක් නොවන පරිදි වැඩ කරගන්න.

⭕ සමුහය තුල අනිසි වීඩියෝ හෝ පින්තුර පල කිරීමෙන් වලකින්න.

⭕ කුණුහරප භාවිතා කිරීමෙන් වලකින්න.

ᴠɪʜᴀɴɢᴀ ʙᴏᴛ ʙʏ ᴠɪʜᴀɴɢᴀ ʜᴀɴꜱᴀɴᴀ",
};
