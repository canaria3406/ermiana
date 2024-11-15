import { delMsgCommand } from './delMsgCommand.js';
import { morePicCommand } from './morePicCommand.js';
import { pagePicCommand } from './pagePicCommand.js';
import { theAPicCommand } from './theAPicCommand.js';
import { theBPicCommand } from './theBPicCommand.js';
import { theNPicCommand } from './theNPicCommand.js';
import { theZPicCommand } from './theZPicCommand.js';
import { botStatusCommand } from './botStatusCommand.js';

export const btnCommandsMap = new Map([
  ['theAPicture', theAPicCommand],
  ['theBPicture', theBPicCommand],
  ['theNPicture', theNPicCommand],
  ['theZPicture', theZPicCommand],
  ['morePictureButton', morePicCommand],
  ['pagePicture', pagePicCommand],
  ['botStatus', botStatusCommand],
]);

export const msgCommandsMap = new Map([
  ['removeMessage', delMsgCommand],
]);


