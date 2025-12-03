const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('./config.json');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// 커맨드 폴더에서 모든 커맨드 파일 가져오기
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// 각 파일의 'data'를 JSON으로 변환하여 리스트에 추가
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// REST 모듈 준비
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// 커맨드 배포 시작
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// 특정 서버에만 즉시 반영하려면 Routes.applicationGuildCommands(clientId, guildId)를 사용하세요.
		// Routes.applicationCommands(clientId)를 사용하면 모든 서버에 적용되지만 최대 1시간이 걸릴 수 있음
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// 에러 발생 시 로그 출력
		console.error(error);
	}
})();