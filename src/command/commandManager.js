import { delMsgCommand } from './delMsgCommand.js';
import { morePicCommand } from './morePicCommand.js';

export const commands = [
  {
    commandNames: '刪除訊息',
    handler: delMsgCommand },
  {
    commandNames: 'morePictureButton',
    handler: morePicCommand },
];
