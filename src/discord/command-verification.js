import { isDeepStrictEqual } from 'node:util';

export function applicationCommandLocalizationShape(command) {
  return {
    name: command.name,
    type: command.type,
    nameLocalizations: command.name_localizations ?? {},
    description: command.description || null,
    descriptionLocalizations: command.description_localizations ?? {},
    options: (command.options ?? []).map((option) => ({
      name: option.name,
      type: option.type,
      nameLocalizations: option.name_localizations ?? {},
      description: option.description || null,
      descriptionLocalizations: option.description_localizations ?? {},
      choices: (option.choices ?? []).map((choice) => ({
        name: choice.name,
        value: choice.value,
        nameLocalizations: choice.name_localizations ?? {},
      })),
    })),
  };
}

export function applicationCommandsMatchDefinition(commands, expectedCommands) {
  return commands.length === expectedCommands.length
    && expectedCommands.every((expected) => commands.some((command) => (
      isDeepStrictEqual(
        applicationCommandLocalizationShape(command),
        applicationCommandLocalizationShape(expected),
      )
    )));
}
