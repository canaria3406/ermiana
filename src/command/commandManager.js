import { delMsgCommand } from './delMsgCommand.js';
import { morePicCommand } from './morePicCommandV2.js';
import { pagePicCommand } from './pagePicCommand.js';
import { theAPicCommand } from './theAPicCommand.js';
import { theBPicCommand } from './theBPicCommand.js';
import { theNPicCommand } from './theNPicCommand.js';
import { theZPicCommand } from './theZPicCommand.js';

export const btnCommandsMap = new Map([
  ['theAPicture', theAPicCommand],
  ['theBPicture', theBPicCommand],
  ['theNPicture', theNPicCommand],
  ['theZPicture', theZPicCommand],
  ['morePictureButton', morePicCommand],
  ['pagePicture', pagePicCommand],
]);

export const msgCommandsMap = new Map([
  ['removeMessage', delMsgCommand],
]);


