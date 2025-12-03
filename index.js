// 1. 필요한 모듈 가져오기
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

const channelsPath = path.join(__dirname, 'data/channels.json');

// 2. 클라이언트 객체 생성
const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildVoiceStates,
] });

// 3. 커맨드 컬렉션 초기화 및 동적 로딩
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// 'data'와 'execute' 프로퍼티가 있는지 확인
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// 헬퍼 함수: 허용된 채널인지 확인
function isChannelAllowed(guildId, channelId) {
	try {
		const data = fs.readFileSync(channelsPath, 'utf8');
		const channels = JSON.parse(data);
		// 해당 서버에 설정된 채널이 없거나, 설정된 채널과 현재 채널이 일치하면 true
		// (설정된 채널이 아예 없으면 모든 채널 허용? 아니면 아무데도 안됨? -> 여기서는 '설정된 채널이 있으면 거기서만'으로 해석)
		const allowedChannelId = channels[guildId];
		if (!allowedChannelId) return true; // 설정이 없으면 일단 모든 채널 허용 (또는 false로 바꿔서 엄격하게 제한 가능)
		return allowedChannelId === channelId;
	} catch (error) {
		console.error('Error reading channels file:', error);
		return true; // 에러 시 일단 허용 (안전하게 하려면 false)
	}
}

// 4. 봇 준비 이벤트
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// 5. 인터랙션(슬래시 커맨드) 처리 이벤트
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	// 'setchannel' 명령어는 어디서든 실행 가능해야 함 (그래야 설정을 하니까)
	if (interaction.commandName !== 'setchannel') {
		if (!isChannelAllowed(interaction.guildId, interaction.channelId)) {
			await interaction.reply({ content: '이 채널에서는 봇 명령어를 사용할 수 없습니다.', ephemeral: true });
			return;
		}
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// 6. 메시지 이벤트 (일반 채팅 감지)
client.on(Events.MessageCreate, async message => {
	if (message.author.bot) return; // 봇 메시지 무시

	// 채널 확인
	if (!isChannelAllowed(message.guildId, message.channelId)) return;

	// 예시: ping 메시지에 반응
	if (message.content === 'ping') {
		message.reply('pong');
	}

	// join 메시지에 반응하여 음성 채널 입장
	if (message.content === 'join') {
		// 유저가 음성 채널에 있는지 확인
		if (message.member.voice.channel) {
			try {
				const connection = joinVoiceChannel({
					channelId: message.member.voice.channel.id,
					guildId: message.guild.id,
					adapterCreator: message.guild.voiceAdapterCreator,
				});
				message.reply(`Successfully joined ${message.member.voice.channel.name}!`);
			} catch (error) {
				console.error(error);
				message.reply('There was an error connecting to the voice channel!');
			}
		} else {
		}
	}

	// leave 메시지에 반응하여 음성 채널 퇴장
	if (message.content === 'leave') {
		const connection = getVoiceConnection(message.guild.id);
		if (connection) {
			try {
				connection.destroy(); // 연결 종료
				message.reply('Successfully left the voice channel!');
			} catch (error) {
				console.error(error);
				message.reply('There was an error leaving the voice channel!');
			}
		} else {
			message.reply('I am not in a voice channel!');
		}
	}
});

// 7. 로그인
client.login(process.env.DISCORD_TOKEN);