export async function typingSender(message) {
  try {
    await message.channel.sendTyping();
  } catch {
    // console.log('send typing error');
  }
}
