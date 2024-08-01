export async function embedSuppresser(message) {
  try {
    if (message.deletable) {
      await message.suppressEmbeds(true);
    }
  } catch {
    // console.log('no permission');
  }
}
