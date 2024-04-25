import { delMsgCommand } from './delMsgCommand.js';
import { morePicCommand } from './morePicCommand.js';
import { pagePicCommand } from './pagePicCommand.js';
import { theAPicCommand } from './theAPicCommand.js';
import { theBPicCommand } from './theBPicCommand.js';
import { theNPicCommand } from './theNPicCommand.js';
import { theZPicCommand } from './theZPicCommand.js';

export const commands = [
  {
    commandNames: '刪除訊息',
    handler: delMsgCommand },
  {
    commandNames: 'morePictureButton',
    handler: morePicCommand },
  {
    commandNames: 'pagePicture',
    handler: pagePicCommand },
  {
    commandNames: 'theAPicture',
    handler: theAPicCommand },
  {
    commandNames: 'theBPicture',
    handler: theBPicCommand },
  {
    commandNames: 'theNPicture',
    handler: theNPicCommand },
  {
    commandNames: 'theZPicture',
    handler: theZPicCommand },
];
