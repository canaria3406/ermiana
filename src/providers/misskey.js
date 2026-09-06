import { createPreview, engagement, ICONS, truncate } from './helpers.js';

function isImage(file) {
  return file?.type?.startsWith('image/');
}

export const misskeyProvider = {
  id: 'misskey',
  patterns: [/https:\/\/misskey\.io\/notes\/([a-zA-Z0-9]{10,16})/i],
  async resolve({ match, http }) {
    const note = await http.postJson('https://misskey.io/api/notes/show', { noteId: match[1] });
    if (!note?.user) throw new Error('Misskey response has no note author');
    const images = (note.files ?? []).filter(isImage).map((file) => file.url);
    const videos = (note.files ?? []).filter((file) => file.type?.startsWith('video/')).map((file) => file.url);
    const likes = Object.values(note.reactions ?? {}).reduce((total, count) => total + Number(count), 0);
    return createPreview({
      canonicalUrl: match[0],
      iconUrl: ICONS.misskey,
      embed: {
        color: 0x96d04a,
        author: { name: `@${note.user.username}`, iconUrl: note.user.avatarUrl },
        title: truncate(note.user.name || note.user.username, 256),
        url: match[0],
        description: truncate(note.text, 4096),
        image: images[0],
        footer: engagement({ replies: note.repliesCount, reposts: note.renoteCount, likes }),
      },
      images,
      media: videos,
    });
  },
};
