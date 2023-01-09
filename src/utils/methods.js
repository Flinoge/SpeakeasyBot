export function mentionToId(mention) {
  return mention.replace("<", "").replace(">", "").replace("@", "");
}

export function idToMention(id) {
  return `<@${id}>`;
}
