require('dotenv').config();

const prefix = process.env.PREFIX;
const groupId = process.env.GROUP;
const tryoutChannelId = process.env.TRYOUTCHANNELID;
const TryoutTime = process.env.TRYOUTTIME;
const tryoutRoleId = process.env.TRYOUTROLEID;
const RankCheckInterval = process.env.RANKCHECKINTERVAL;
const secondaryGroupId = process.env.SECONDARYGROUPID;
let rankBindings;

const { Client, IntentsBitField } = require('discord.js');
const noblox = require('noblox.js');
const fs = require('fs');
const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
});

noblox.setCookie(process.env.ROBLOSECURITY);

fs.readFile('./rankBindings.json', (err, data) =>  {
    if (err) {
        console.warn('ERROR: ' + err);
    } else {
        rankBindings = JSON.parse(data);
    }
});

async function getGroupMembers(groupId) {
    const rolesUrl = `https://groups.roblox.com/v1/groups/${groupId}/roles`;
    const rolesResponse = await fetch(rolesUrl);
    const rolesData = await rolesResponse.json();

    const members = [];

    for (const role of rolesData.roles) {
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
            const usersUrl = `https://groups.roblox.com/v1/groups/${groupId}/roles/${role.id}/users?cursor=${cursor || ''}`;
            const usersResponse = await fetch(usersUrl);
            const usersData = await usersResponse.json();

            for (const user of usersData.data) {
                members.push({
                    userId: user.userId,
                    username: user.username,
                    role: role.name,
                });
            }

            cursor = usersData.nextPageCursor;
            hasMore = !!cursor;
        }
    }

    return members;
}

async function rankUser(username, rank, isUserId) {
    try {
        let userId;

        if (isUserId) {
            userId = username;
        } else {
            const userResponse = await fetch(`https://users.roblox.com/v1/users/search?keyword=${username}&limit=10`);
            const userData = await userResponse.json();

            if (userData.data == undefined) {
                const userResponse = await fetch(`https://users.roblox.com/v1/users/search?keyword=${username}&limit=10`);
                const userData = await userResponse.json();
                userId = userData.data[0].id
            } else {
                userId = userData.data[0].id
            }

        }

        if (!userId) {
            return `User ${username} not found.`;
        }

        const result = await noblox.setRank(parseInt(groupId), userId, rank);
        return `User ${username} ranked to ${result.rank}`;
    } catch (error) {
        return "Error ranking user:", error
    }
}

client.on('ready', () => {
    console.log(`The bot is ready.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(prefix + 'rank')) {
        const args = message.content.split(' ');
        const username = args[1];
        const rank = args.slice(2).join(' ');
        if (!username || !rank) {
            message.reply("Usage: `" + prefix + "rank <username> <rank>`");
            return;
        }
        
        const response = await rankUser(username, rank, false);
        message.reply(response.toString());
    } else if (message.content.startsWith(prefix + 'ping')) {
        const channel = await client.channels.fetch(tryoutChannelId);

        if (channel.isTextBased()) {
            const sentMessage = await channel.send(`[HOST]: <@${message.author.id}>\n[EVENT]: Tryout\n[TIME]: IN ${TryoutTime} MINS\n[REACT ✅]\n[PING]: <@&${tryoutRoleId}>`);
            sentMessage.react('✅');
        }
    } else if (message.content.startsWith(prefix + 'bmt')) {
        const channel = await client.channels.fetch(tryoutChannelId);

        if (channel.isTextBased()) {
            const sentMessage = await channel.send(`[HOST]: <@${message.author.id}>\n[EVENT]: Basic Military Training\n[TIME]: IN ${TryoutTime} MINS\n[REACT ✅]\n[PING]: <@${message.mentions.users.first().id}>`);
            sentMessage.react('✅');
        }
    } else if (message.content.startsWith(prefix + 'tryout')) {
        const channel = await client.channels.fetch(tryoutChannelId);

        if (channel.isTextBased()) {
            const sentMessage = await channel.send(`[HOST]: <@${message.author.id}>\n[EVENT]: Tryout\n[TIME]: IN ${TryoutTime} MINS\n[REACT ✅]\n[PING]: <@${message.mentions.users.first().id}>`);
            sentMessage.react('✅');
        }
    };
});

client.login(process.env.DISCORD_BOT_ID);

setTimeout(() =>  {
    let groupData = getGroupMembers(secondaryGroupId);

    let groupRanksKeys = Object.keys(groupData);
    let groupRanksValues = Object.values(groupData);

    for (let i = 0; i < groupRanksKeys.length; i++) {
        let key = groupRanksKeys[i];
        let value = groupRanksValues[i];

        for (let user of value) {
            if (rankBindings[key] !== null && rankBindings[key] !== undefined) {
                rankUser(user.userId, rankBindings[key], true);
            }
        }
    }
}, RankCheckInterval * 60000);