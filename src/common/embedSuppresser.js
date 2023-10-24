export async function embedSuppresser(message) {
  try {
    await message.suppressEmbeds(true);
  } catch {
    console.log('no permission');
  }
}
