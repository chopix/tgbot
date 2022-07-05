const TelegramBot = require('node-telegram-bot-api');
const md5 = require("md5")
const SampApi = require("./modules/SampApi")
const query = require('samp-query')
const connection = require("./config/mysql")
require('dotenv').config();
const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB
  }
});

let options = {
  host: '185.169.134.171',
  // port: process.env.PORT
}


const bot = new TelegramBot(process.env.TOKEN, {polling: true});

bot.onText(/\/serverstat (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const serverIp = match[1]
  options.host = serverIp;
  query(options, function (error, response) {
    if(error)
      bot.sendMessage(chatId, error)
    else {
      const html = `
<b>Название сервера:</b> ${response.hostname}
<b>Кол-во слотов:</b> ${response.maxplayers}
<b>Онлайн:</b> ${response.online}
<b>Сайт:</b> ${response.rules.weburl}
      `
      bot.sendMessage(chatId, html, {parse_mode: 'HTML'})
    }

  })
})

bot.onText(/\/changepass (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userNickname = match[1];
  const userPass = match[2];
  let sql = 'UPDATE `s_users` SET `pKey` = "' + md5(md5(userPass)) + '" WHERE `Name` = "' + userNickname + '"'

  connection.query(sql, (err, res) => {
    if(err) console.log(err);
    if(res.affectedRows === 0) {
      bot.sendMessage(chatId, 'Аккаунт не найден =(. Попробуйте ввести команду в формате /changepass [Nickname] [Password]')
    } else {
      bot.sendMessage(chatId, `Вы успешно обновили пароль у ${userNickname}`);
    }
  })
});

bot.onText(/\/setadmin (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userNickname = match[1];
  const adminLvl = match[2];
  let sql = "INSERT INTO s_admin (Name, level, LastCon) VALUES (?)";
  let values = [
    `${userNickname}`, `${adminLvl}`, '0'
  ]
  connection.query(sql, [values], (err, res) => {
    if(err) console.log(err);
    bot.sendMessage(chatId, `Вы успешно выдали админку ${adminLvl} уровня игроку ${userNickname}`);
  })
});

bot.onText(/\/starterpack (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userNickname = match[1];
  const sqlSelect = knex.select('pLevel', 'pMats', 'pDrugs', 'pCash').from('s_users').where('Name', userNickname).then(data => {
    let forEached = data.forEach(e => {
      knex('s_users').where('Name', userNickname).update({
        pLevel: e.pLevel + 5,
        pMats: e.pMats + 15000,
        pDrugs: e.pDrugs + 15000,
        pCash: e.pCash + 300000
      }).then((res) => {
        if(!res) {
          bot.sendMessage(chatId, 'Аккаунт не найден')
        } else {
          bot.sendMessage(chatId, `Вы успешно выдали стартовый пакет игроку ${userNickname}`);
        }
        console.log(res);
      })
    })
  });
});

bot.onText(/\/flist/, (msg) => {
  const chatId = msg.chat.id;
  const sqlSelect = knex.select('fID', 'fName', 'fLeader').from('s_fraction').orderBy('fID', 'asc').then(data => {
    let newData = data.map(e => {
      return `
<b>ID Фракции:</b> ${e.fID}
<b>Назв. фракции:</b> ${e.fName}
<b>Лидер фракции:</b> ${e.fLeader}
`
    }).join('==================================')
    console.log(newData);
    bot.sendMessage(chatId, newData, {parse_mode: 'HTML'});
    });
});

bot.onText(/\/users/, msg => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const sqlSelect = knex.select('Name').from('s_users').orderBy('pID', 'asc').then(data => {
    let newData = data.map(e => {
      return e.Name;
    }).join('\n')
    bot.sendMessage(chatId, newData, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '<< Предыдущая страница',
              callback_data: 'prev'
            },
            {
              text: '>> Следующая страница',
              callback_data: 'next'
            }
          ]
        ]
      }
    });
  })
})



bot.onText(/\/user (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userNickname = match[1]
  function getSex(sex) {
    let sexName;
    switch(sex) {
      case 1:
        sexName = 'Мужской'
        break;
      case 2:
        sexName = 'Женский'
        break;
      default:
        sexName = 'Собака по гендеру'
        break;
    }
    return sexName;
  }
  const sqlSelect = knex.select('*').from('s_users').where('Name', userNickname).then(data => {
    let newData = data.map(e => {
      let newSex = getSex(e.pSex);
      return `
<b>ID:</b> ${e.pID}
<b>Ник:</b> ${e.Name}
<b>Уровень:</b> ${e.pLevel}
<b>Денег:</b> ${e.pCash}
<b>Депозит:</b> ${e.pID}
<b>Материалов:</b> ${e.pID}
<b>Наркотиков:</b> ${e.pID}
<b>Пол:</b> ${newSex}
`
    }).join('\n')
    if(!newData) {
      bot.sendMessage(chatId, 'Аккаунт не найден =(((( Попробуйте написать /user [Ник]')
    } else {
      bot.sendMessage(chatId, newData, {parse_mode: 'HTML'})
    }
  })
})
