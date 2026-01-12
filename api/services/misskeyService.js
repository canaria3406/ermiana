import axios from 'axios';

export class MisskeyService {
  static async getNoteData(noteId) {
    try {
      const response = await axios.request({
        method: 'post',
        url: 'https://misskey.io/api/notes/show',
        data: { noteId },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch Misskey data');
      }

      const note = response.data;

      const media = {
        images: note.files?.filter((f) => f.type.startsWith('image/')).map((f) => ({
          url: f.url,
          thumbnailUrl: f.thumbnailUrl,
          type: f.type,
          isSensitive: f.isSensitive,
        })) || [],
        videos: note.files?.filter((f) => f.type.startsWith('video/')).map((f) => ({
          url: f.url,
          thumbnailUrl: f.thumbnailUrl,
          type: f.type,
          isSensitive: f.isSensitive,
        })) || [],
      };

      return {
        success: true,
        data: {
          id: noteId,
          url: `https://misskey.io/notes/${noteId}`,
          author: {
            id: note.user.id,
            username: note.user.username,
            name: note.user.name || note.user.username,
            avatarUrl: note.user.avatarUrl,
          },
          text: note.text || '',
          createdAt: note.createdAt,
          stats: {
            replies: note.repliesCount || 0,
            renotes: note.renoteCount || 0,
            reactions: Object.values(note.reactions || {}).reduce((a, b) => a + b, 0),
          },
          media,
          isSensitive: note.cw !== null || media.images.some((i) => i.isSensitive) || media.videos.some((v) => v.isSensitive),
        },
      };
    } catch (error) {
      console.error('Misskey API Error:', error.message);
      throw {
        statusCode: error.response?.status || 500,
        message: error.message || 'Failed to fetch Misskey data',
        code: 'MISSKEY_API_ERROR',
      };
    }
  }
}
