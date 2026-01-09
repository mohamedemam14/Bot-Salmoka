const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { blockhash64 } = require('blockhash-core');
const { createCanvas, loadImage } = require('canvas');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// إعدادات القنوات
const REPORTS_CHANNEL_ID = '1457423689195978964'; // روم التقارير
const ADMIN_CHANNEL_ID = '1459208046403391560';   // روم الإدارة

// قاعدة بيانات مؤقتة لتخزين بصمات الصور
const imageCache = new Map();

client.once('ready', () => {
    console.log(`تم تشغيل البوت باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // تجاهل البوتات والرسائل خارج روم التقارير
    if (message.author.bot || message.channel.id !== REPORTS_CHANNEL_ID) return;

    if (message.attachments.size > 0) {
        message.attachments.forEach(async (attachment) => {
            // التحقق من أن الملف صورة
            const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
            const isImage = imageExtensions.some(ext => attachment.name.toLowerCase().endsWith(ext));

            if (isImage) {
                try {
                    // تحليل الصورة وإنشاء بصمة (Hash) لها
                    const img = await loadImage(attachment.url);
                    const canvas = createCanvas(img.width, img.height);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    
                    const hash = blockhash64(imageData, 16);

                    // التحقق من وجود البصمة مسبقاً
                    if (imageCache.has(hash)) {
                        const originalReportUrl = imageCache.get(hash);

                        // إرسال تنبيه للإدارة
                        const adminChannel = client.channels.cache.get(ADMIN_CHANNEL_ID);
                        if (adminChannel) {
                            const alertEmbed = new EmbedBuilder()
                                .setTitle('⚠️ كشف تقرير مكرر!')
                                .setColor(0xFF0000) // أحمر
                                .setDescription(`قام العضو ${message.author} بإرسال صورة مكررة موجودة مسبقاً.`)
                                .addFields(
                                    { name: 'رابط التقرير الجديد', value: `[اضغط هنا](${message.url})` },
                                    { name: 'رابط التقرير الأصلي', value: `[اضغط هنا](${originalReportUrl})` }
                                )
                                .setThumbnail(attachment.url)
                                .setTimestamp();

                            adminChannel.send({ embeds: [alertEmbed] });
                        }
                    } else {
                        // حفظ البصمة في الذاكرة
                        imageCache.set(hash, message.url);
                    }
                } catch (error) {
                    console.error('خطأ في معالجة الصورة:', error);
                }
            }
        });
    }
});

client.login('YOUR_BOT_TOKEN_HERE');
