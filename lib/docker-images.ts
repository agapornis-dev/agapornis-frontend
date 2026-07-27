export type DockerImageOption = {
  label?: string;
  image: string;
};

function versionParts(option: DockerImageOption) {
  const value = `${option.label || ''} ${option.image || ''}`;
  const runtime = value.match(
    /(?:java|jdk|jre|openjdk|temurin)[^0-9]{0,12}(\d{1,3})/i
  );

  if (runtime) return [Number(runtime[1])];

  const tag = option.image.includes(':')
    ? option.image.slice(option.image.lastIndexOf(':') + 1)
    : value;
  return Array.from(tag.matchAll(/\d+/g), match => Number(match[0]));
}

function compareVersions(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (right[index] ?? -1) - (left[index] ?? -1);
    if (difference) return difference;
  }
  return 0;
}

export function dockerImagesForEgg(egg: any): DockerImageOption[] {
  const options: DockerImageOption[] = egg?.dockerImages?.length
    ? egg.dockerImages
    : (egg?.images || []).map((image: string) => ({ label: image, image }));

  return options
    .map((option, index) => ({ option, index, version: versionParts(option) }))
    .sort((left, right) =>
      compareVersions(left.version, right.version) || left.index - right.index
    )
    .map(entry => entry.option);
}
