export async function embedSuppresser(message) {
  try {
    if (message.deletable) {
      // console.log('suppressed');
      await message.suppressEmbeds(true);
    }
  } catch {
    // console.log('no permission');
  }
}
