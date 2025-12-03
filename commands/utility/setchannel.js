const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const channelsPath = path.join(__dirname, '../../data/channels.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('Sets the current channel as the bot\'s active channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 관리자만 사용 가능하도록 설정
	async execute(interaction) {
		const guildId = interaction.guildId;
		const channelId = interaction.channelId;

		// 파일 읽기
		let channels = {};
		try {
			const data = fs.readFileSync(channelsPath, 'utf8');
			channels = JSON.parse(data);
		}
		catch (error) {
			console.error('Error reading channels file:', error);
			return interaction.reply({ content: '설정 파일을 읽는 중 오류가 발생했습니다.', ephemeral: true });
		}

		// 채널 정보 업데이트 (해당 서버의 채널을 현재 채널로 설정)
		channels[guildId] = channelId;

		// 파일 저장
		try {
			fs.writeFileSync(channelsPath, JSON.stringify(channels, null, 2), 'utf8');
			await interaction.reply(`이 채널(<#${channelId}>)이 봇의 활동 채널로 설정되었습니다.`);
		}
		catch (error) {
			console.error('Error writing channels file:', error);
			await interaction.reply({ content: '설정 파일을 저장하는 중 오류가 발생했습니다.', ephemeral: true });
		}
	},
};