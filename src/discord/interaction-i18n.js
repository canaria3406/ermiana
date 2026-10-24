export const INTERACTION_LOCALES = Object.freeze(['en-GB', 'en-US', 'zh-TW', 'zh-CN', 'ja']);

export function translations(english, traditionalChinese, simplifiedChinese, japanese) {
  return Object.freeze({
    'en-GB': english,
    'en-US': english,
    'zh-TW': traditionalChinese,
    'zh-CN': simplifiedChinese,
    ja: japanese,
  });
}

export const INTERACTION_MESSAGES = Object.freeze({
  'common.administratorOnly': translations(
    'Only server administrators can use this command.',
    '只有伺服器管理員可以使用此指令。',
    '只有服务器管理员可以使用此命令。',
    'このコマンドはサーバー管理者のみ使用できます。',
  ),
  'common.unexpectedError': translations(
    'An error occurred while processing your request.',
    '處理時發生錯誤。',
    '处理时发生错误。',
    '処理中にエラーが発生しました。',
  ),
  'common.settingsSavedCachePending': translations(
    ' Settings were saved and will sync automatically when the cache recovers.',
    ' 設定已保存；快取恢復後會自動同步。',
    ' 设置已保存；缓存恢复后会自动同步。',
    ' 設定は保存されており、キャッシュの復旧後に自動で同期されます。',
  ),
  'common.settingsClearedCachePending': translations(
    ' Settings were cleared and will sync automatically when the cache recovers.',
    ' 設定已清除；快取恢復後會自動同步。',
    ' 设置已清除；缓存恢复后会自动同步。',
    ' 設定は消去されており、キャッシュの復旧後に自動で同期されます。',
  ),
  'removeMessage.success': translations(
    'Message deleted successfully.',
    '成功刪除訊息。',
    '成功删除消息。',
    'メッセージを削除しました。',
  ),
  'removeMessage.failed': translations(
    'Failed to delete the message.',
    '刪除訊息時發生錯誤。',
    '删除消息时发生错误。',
    'メッセージの削除に失敗しました。',
  ),
  'removeMessage.noPermission': translations(
    'I cannot delete this message. Please contact the server administrator to grant me the necessary permissions.',
    '我無法刪除這個訊息，請聯絡伺服器管理員，並給我相關權限。',
    '我无法删除这条消息，请联系服务器管理员，并授予我必要的权限。',
    'このメッセージを削除できません。サーバー管理者に連絡して、関連する権限を与えてください。',
  ),
  'removeMessage.notMine': translations(
    'I can only delete messages that I have sent.',
    '我只能刪除由我自己發送的訊息喔。',
    '我只能删除自己发送的消息。',
    '私は自分で送信したメッセージのみを削除できます。',
  ),
  'banPreview.disabled': translations(
    'Previews for {provider} have been disabled in this server.',
    '已停用此伺服器的 {provider} 預覽。',
    '已禁用此服务器的 {provider} 预览。',
    'このサーバーで{provider}のプレビューを無効にしました。',
  ),
  'banPreview.restored': translations(
    'Previews for {provider} have been restored in this server.',
    '已恢復此伺服器的 {provider} 預覽。',
    '已恢复此服务器的 {provider} 预览。',
    'このサーバーで{provider}のプレビューを再度有効にしました。',
  ),
  'twitterStyle.success': translations(
    'Twitter previews in this server are now set to {style}.',
    '已將此伺服器的 Twitter 預覽設定為 {style}。',
    '已将此服务器的 Twitter 预览设置为 {style}。',
    'このサーバーのTwitterプレビューを{style}に設定しました。',
  ),
  'resetPreview.success': translations(
    'All website previews have been restored in this server.',
    '已恢復此伺服器的所有網站預覽。',
    '已恢复此服务器的所有网站预览。',
    'このサーバーですべてのサイトのプレビューを元に戻しました。',
  ),
  'info.healthy': translations(
    'ermiana is operating normally.\nCache status: Ready.\nCurrently running on Shard {shard}.',
    'ermiana 正常運作中。\nCache 狀態：正常。\n目前正在 Shard {shard} 運作中。',
    'ermiana 正常运行中。\n缓存状态：正常。\n目前正在 Shard {shard} 上运行。',
    'ermianaは正常に稼働しています。\nキャッシュ状態：正常。\n現在Shard {shard}で稼働しています。',
  ),
  'info.degraded': translations(
    'ermiana is operating in degraded mode.\nCache status: Not ready; server settings are temporarily being read directly from the database.\nCurrently running on Shard {shard}.',
    'ermiana 降級運作中。\nCache 狀態：未就緒，暫時直接自資料庫讀取伺服器設定。\n目前正在 Shard {shard} 運作中。',
    'ermiana 正在降级运行。\n缓存状态：未就绪，暂时直接从数据库读取服务器设置。\n目前正在 Shard {shard} 上运行。',
    'ermianaは縮退運転中です。\nキャッシュ状態：未準備のため、サーバー設定を一時的にデータベースから直接読み取っています。\n現在Shard {shard}で稼働しています。',
  ),
  'check.permission.viewChannel': translations('View Channel', '檢視頻道', '查看频道', 'チャンネルを見る'),
  'check.permission.sendMessages': translations('Send Messages', '傳送訊息', '发送消息', 'メッセージを送信'),
  'check.permission.sendMessagesInThreads': translations(
    'Send Messages in Threads',
    '在討論串中傳送訊息',
    '在子区中发送消息',
    'スレッドでメッセージを送信',
  ),
  'check.permission.manageMessages': translations('Manage Messages', '管理訊息', '管理消息', 'メッセージの管理'),
  'check.permission.embedLinks': translations('Embed Links', '嵌入連結', '嵌入链接', '埋め込みリンク'),
  'check.permission.readMessageHistory': translations(
    'Read Message History',
    '讀取訊息歷史記錄',
    '读取消息历史',
    'メッセージ履歴を読む',
  ),
  'check.missingPermission': translations(
    '- {permission}: missing in {count} channel(s) ({channels}{overflow})',
    '- {permission}：{count} 個頻道缺少 ({channels}{overflow})',
    '- {permission}：{count} 个频道缺少 ({channels}{overflow})',
    '- {permission}：{count}チャンネルで不足しています（{channels}{overflow}）',
  ),
  'check.channelSeparator': translations(', ', '、', '、', '、'),
  'check.overflow': translations(', and {count} more', '，另 {count} 個', '，另有 {count} 个', '、ほか{count}件'),
  'check.noMissingPermissions': translations(
    'No other permission issues were found in readable channels.',
    '可讀取頻道中未發現其他權限缺失。',
    '可读取频道中未发现其他权限缺失。',
    '閲覧可能なチャンネルでは、ほかに権限の不足は見つかりませんでした。',
  ),
  'check.missingPermissions': translations(
    'Bot permission issues in readable channels:\n{missing}',
    '可讀取頻道的 Bot 權限設定異常：\n{missing}',
    '可读取频道的 Bot 权限设置异常：\n{missing}',
    '閲覧可能なチャンネルでBotの権限に問題があります：\n{missing}',
  ),
  'check.hiddenChannels': translations(
    '\nChannels without the “{permission}” permission: {count}.',
    '\n未開放「{permission}」權限：{count} 個。',
    '\n未开放“{permission}”权限：{count} 个。',
    '\n「{permission}」権限がないチャンネル：{count}件。',
  ),
  'check.summary': translations(
    'Readable channels: {readable} / {total}.{visibility}\n{status}',
    '可讀取頻道：{readable} / {total} 個。{visibility}\n{status}',
    '可读取频道：{readable} / {total} 个。{visibility}\n{status}',
    '閲覧可能なチャンネル：{readable} / {total}件。{visibility}\n{status}',
  ),
  'fix.unsupported': translations(
    'This link is not supported.',
    '不支援的連結。',
    '不支持此链接。',
    'このリンクには対応していません。',
  ),
  'fix.noPreview': translations(
    'A preview cannot currently be generated for this link.',
    '目前無法產生此連結的預覽。',
    '目前无法生成此链接的预览。',
    '現在このリンクのプレビューを生成できません。',
  ),
  'pagination.unavailable': translations(
    'An unexpected error occurred.',
    '發生預期之外的錯誤。',
    '发生了意外错误。',
    '予期しないエラーが発生しました。',
  ),
});

export function localizeInteraction(key, locale, variables = {}) {
  const messages = Object.hasOwn(INTERACTION_MESSAGES, key) ? INTERACTION_MESSAGES[key] : undefined;
  if (!messages) throw new Error(`Unknown interaction message: ${key}`);
  const template = Object.hasOwn(messages, locale) ? messages[locale] : messages['en-US'];
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (placeholder, name) => (
    Object.hasOwn(variables, name) ? String(variables[name]) : placeholder
  ));
}
