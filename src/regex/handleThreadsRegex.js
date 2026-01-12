// import axios from 'axios';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleThreadsRegex( result, message, spoiler ) {
  try {
    await typingSender(message);
    backupLinkSender(message, spoiler, result[0].replace(/threads\.net/, 'fixthreads.net'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    embedSuppresser(message);
  } catch {
    // console.log('threads error: '+ message.guild.name);
    return;
  }
};
